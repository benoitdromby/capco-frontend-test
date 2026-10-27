# API notes

Working notes on `frontend/public/openapi.json` for TICKET-001, TICKET-002 and TICKET-003.
The contract is the source of truth: if this file and the contract disagree, the contract wins.

## 1. Rules shared by every request

### Media type

| Header | Value | Error if wrong |
|---|---|---|
| `Content-Type` (requests with a body) | `application/vnd.api+json`, **no parameters** (no `; charset=utf-8`) | 415 `unsupported-media-type` |
| `Accept` | `application/vnd.api+json` | 406 `not-acceptable` |

Both headers are set once, in the shared API client.

### Error document

Every error response has this shape:

```json
{
  "errors": [
    {
      "status": "400",
      "code": "validation-failed",
      "title": "Invalid attribute",
      "detail": "Enter a valid email address.",
      "source": { "pointer": "/data/attributes/email" }
    }
  ]
}
```

- `status`, `code`, `title` and `detail` are always present. `source.pointer` is present only for field errors.
- One response can contain **several** errors, for example email and password at once.
- Client logic branches on `code`, which is stable. It never branches on `detail` text.
- `source.pointer` maps an error to a form field: `/data/attributes/<fieldName>`.

### CSRF

- A successful sign-in sets a JavaScript-readable `XSRF-TOKEN` cookie and returns the same value in the `X-CSRF-TOKEN` response header.
- Every authenticated **state-changing** request sends it back as the `X-XSRF-TOKEN` request header:
  - `POST /api/v1/applicant-applications`
  - `PATCH /api/v1/applicant-applications/{id}/form`
  - `DELETE /api/v1/applicant-sessions/current`
- A missing or invalid token returns **403 `access-denied`**, not a CSRF-specific code.
- The client reads the token from the cookie at request time rather than keeping it in memory, so it survives a page reload.

### Session cookie

- The session cookie is `__Host-KYCSESSION`: HttpOnly, Secure, and set by the API.
- In development, the frontend dev server proxies `/api/v1` to the backend, so requests are same-origin. The default `fetch` setting (`credentials: 'same-origin'`) is enough.
- The `__Host-` prefix requires a secure context. Chrome treats `127.0.0.1` and `localhost` as secure; Safari may drop the cookie over HTTP. Test the session flow in Chrome first.

### Rate limiting

- 429 `rate-limited` comes with a `Retry-After` header, in seconds (at least 1).
- Show the wait time to the user. If a countdown is displayed, do not announce every tick to screen readers.

### Network failure

- If `fetch` throws (server unreachable, connection dropped), treat it as a network error, distinct from an API error response.

### Suggested client error model

| Kind | Source |
|---|---|
| `validation` | 400 `validation-failed` (field errors from pointers) |
| `malformed` | 400 `malformed-document` (a client bug) |
| `invalidCredentials` | 401 `invalid-credentials` |
| `unauthenticated` | 401 `authentication-required` |
| `forbidden` | 403 `access-denied` (often a missing CSRF token) |
| `notFound` | 404 `application-not-found` |
| `conflict` | 409 `email-already-registered` or `form-version-conflict` |
| `unprocessable` | 422 `unprocessable-form` |
| `rateLimited` | 429 `rate-limited` (+ `retryAfterSeconds`) |
| `server` | 500 `internal-error`, 503 `submission-unavailable` |
| `network` | `fetch` threw |
| `unexpected` | Anything else, including a non-JSON:API body |

## 2. TICKET-001: Applicant registration

**Request:** `POST /api/v1/applicant-accounts`

```json
{
  "data": {
    "type": "applicant-accounts",
    "attributes": { "email": "jane@example.com", "password": "Secret!" }
  }
}
```

- Password confirmation is checked on the client only and is **never sent**.

**Validation rules from the contract**

| Field | Rule |
|---|---|
| `email` | Required, valid email format |
| `password` | Required, at least 6 characters, at least one uppercase letter, at least one special character |

- The contract does not define "special character". Working assumption: any character that is not a letter or a digit. The server remains the final authority.
- Password requirements are shown **before** input, linked with `aria-describedby` (WCAG 3.3.2), not only after an error.

**Responses**

| Status | `code` | Handling |
|---|---|---|
| 201 | — | **No body.** Only a `Location` header. Do not call `response.json()`. Show the confirmation. |
| 400 | `validation-failed` | One error per field, using `source.pointer` |
| 400 | `malformed-document` | Generic error message |
| 409 | `email-already-registered` | Clear message, with a link to sign-in |
| 415 / 406 | — | Generic error (client bug) |
| 429 | `rate-limited` | Wait message using `Retry-After` |

**Success**
- Registration does **not** sign the user in.
- Show a confirmation, move focus to its heading, and provide a link to the Applicant sign-in page.
- Use `autocomplete="email"` and `autocomplete="new-password"`.

## 3. TICKET-002: Applicant login

**Request:** `POST /api/v1/applicant-sessions`

```json
{
  "data": {
    "type": "applicant-sessions",
    "attributes": { "email": "jane@example.com", "password": "Secret!" }
  }
}
```

**Responses**

| Status | `code` | Handling |
|---|---|---|
| 201 | — | Body `data.attributes.href` = journey URL. Navigate there. Cookies are set by the browser. |
| 400 | `validation-failed` / `malformed-document` | Field errors from pointers, or a generic error |
| 401 | `invalid-credentials` | **Form-level** message only. Never attach it to the email field, so it does not reveal whether the email is registered. |
| 429 | `rate-limited` | Wait message using `Retry-After` |

**Success**
- Navigate to `href`, never to a hard-coded URL.
- Check that `href` is a same-origin path before navigating (no open redirect).
- Clear the TanStack Query cache (`queryClient.clear()`): the user and session have changed.

**Form behaviour**
- Client-side validation is **required fields only**. Do not apply the registration password policy at login.
- Keep the entered email when an error is shown. Clearing the password field is a decision to document.
- Prevent duplicate submissions using the mutation's pending state. React Aria Components' `Button` has an `isPending` prop that announces the pending state; check whether the DS button exposes it.
- Use `autocomplete="email"` and `autocomplete="current-password"`.

**Logout (needed for TICKET-003)**
- `DELETE /api/v1/applicant-sessions/current` with `X-XSRF-TOKEN`.
- 204, no body. Clear the query cache afterwards.

## 4. TICKET-003: Save and resume the Applicant form

### Load flow

1. `GET /api/v1/applicant-applications/current`
   - **200**: current draft (`data.id`, `currentStep`, `progress`, `href`).
   - **204**: no draft yet. **No body.**
2. If no draft exists: `POST /api/v1/applicant-applications` (with `X-XSRF-TOKEN`).
   - Idempotent: 201 creates a draft, 200 returns the existing one. No duplicates.
   - Decision to document: call it when the journey starts, or on first save.
3. `GET /api/v1/applicant-applications/{applicationId}/form`
   - Returns `answers`, `version`, `currentStep`, `steps`, `documentEvidence`.

### Answers

Keys from the `Answers` schema (`additionalProperties: false`):

`name`, `dateOfBirth`, `country`, `nationality`, `email`, `phone`, `consentConfirmed` (boolean), `documentType`, `documentNumber`, `documentCountry`, `expiry`, `street`, `city`, `postal`, `residentialCountry`

- All values are strings, except `consentConfirmed`, which is a boolean (checkbox).
- `null` or a missing key means an empty field.
- Check that the existing frontend field names match these keys exactly.

### Save

**Request:** `PATCH /api/v1/applicant-applications/{applicationId}/form` with `X-XSRF-TOKEN`

```json
{
  "data": {
    "type": "applicant-application-forms",
    "id": "<id returned by GET form>",
    "attributes": {
      "step": "personal-details",
      "answers": { "name": "Jane Doe", "dateOfBirth": "1990-01-01" },
      "version": 3
    }
  }
}
```

- Send **only the fields of the selected step**. The contract does not say which field belongs to which step: derive it from the existing frontend and keep the mapping in one place.
- Send `version` from the latest form response.
- On 200, the response is the persisted form state with the **new version**. Write it into the query cache (`setQueryData`), or the next save will fail with 409.

### Saved state

- Show "saved" **only after a 200**. No optimistic update.
- Announce it through a `role="status"` region (for example "Saved at 11:42").
- Switch back to "unsaved changes" as soon as the user edits a field.

### Do not overwrite user input

- Disable `refetchOnWindowFocus` (and similar automatic refetches) for the form query, or the form may be reset while the user is typing.
- Initialise form state from API data once, not on every new query result.

### Errors

| Status | `code` | Handling |
|---|---|---|
| 401 | `authentication-required` | Session expired. Show a clear message with a sign-in link, and warn that unsaved changes will be lost. No silent auto-redirect. |
| 403 | `access-denied` | Probably a missing CSRF token. Treat as a session problem. |
| 404 | `application-not-found` | Error message, offer to reload |
| 409 | `form-version-conflict` | The form changed elsewhere. Offer to reload; never overwrite silently. Strategy to document. |
| 422 | `unprocessable-form` | Show `detail` |
| 500 / 503 | `internal-error` / `submission-unavailable` | Error message, allow retry |
| Network | — | Error message, allow retry |

In every error case, the entered values stay in the form. No browser storage is used as a fallback: the ticket requires persisted data to come from the API.

## 5. Contract inconsistencies and open questions

- Step state enums differ: `not-started | current | complete` in `ApplicantApplicationDocument.progress`, but `current | complete | remaining` in `FormAttributes.steps`. Handle both.
- "Special character" is not defined for the password policy.
- The field-to-step mapping is not defined in the contract.
- The login schema declares `minLength: 6` on the password, while TICKET-002 only asks for required-field validation.
- The 415 example for document-evidence uploads mentions `application/vnd.api+json` instead of `multipart/form-data` (out of scope here).
- `POST /api/v1/applicant-applications` (create-or-get draft) is undocumented as needing CSRF — it has no `X-XSRF-TOKEN` entry in its `parameters` and no `403` in its listed responses — but live-verified it requires the header the same as the form PATCH and document-evidence POST do (missing → 403 `access-denied`).
- The login response's `href` is not always the generic `/applications/current`: once any draft exists — even one just created with nothing saved yet — `href` points directly at the in-progress step (e.g. `/applications/{id}/identity-and-address`). Only a user with no draft at all gets the generic journey-entry href. Confirmed live.
