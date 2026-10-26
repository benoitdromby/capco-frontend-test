# CLAUDE.md

Guidance for Claude when working in this repository.

## Context

This is a frontend technical test: a KYC (Know Your Customer) prototype where Applicants register, sign in, and fill a two-step KYC form, and Reviewers inspect applications.
The work is defined by the tickets in `tickets/`. Their acceptance criteria are the definition of done.

Code is reviewed for **quality, maintainability, accessibility, and fit with the existing architecture**. A working feature alone is not enough. Every change must be explainable and justified by the developer.

## Scope rules (strict)

- **Never modify** `backend/` or `frontend/public/openapi.json`. The Java API and its contract are fixed.
- Work only in `frontend/` and `DS/`.
- Visual design is not assessed: do not redesign screens. Keep layouts responsive on desktop and mobile.
- Do not add a dependency without stating why and getting approval first.
- Do not reorganise existing folders. Propose structural changes in `docs/DECISIONS.md` instead.

## Stack

- React 19, React Router 8, TypeScript, TanStack Query, React Aria Components.
- `DS/`: shared React Aria-based component library, documented in Storybook.
- Backend: Java 25, Spring Boot 4, JSON:API over `/api/v1`, SQLite with Flyway.
- The frontend dev server (port 3000) proxies `/api/v1` to the backend (port 8080).

## Commands (run from the repository root)

```bash
npm run dev:app        # frontend + backend (requires JAVA_HOME pointing to JDK 25)
npm run typecheck
npm test
npm run build
npm run quality        # DS quality checks
npm run storybook
npm run test:e2e --workspace frontend
```

Before saying a task is done, run `npm run typecheck` and `npm test`, and report the result. Never claim a check passed without running it.

## Architecture conventions

Follow the existing structure:

- **Route modules** (`frontend/.../routes`) handle navigation, data loading, and page behaviour.
- **Presentation components** render the interface from props. They contain no fetching and no business logic.
- **Reusable UI components** live in `DS/`. Application-specific screens live in `frontend/`.
- Use the domain vocabulary from the README glossary: Applicant, Application, Reviewer, Journey, Step, Current application, Submitted, Status, Presentation, Fixture.
- Fixtures are sample data, never persisted data.

Code quality expectations:

- Business logic, API calls, and non-trivial state live in **custom hooks** (for example `useRegisterApplicant`, `useApplicantLogin`, `useCurrentApplication`, `useSaveApplicationForm`), not inside components.
- All API calls go through the shared API client. No `fetch` calls in components.
- Server state is managed with TanStack Query (queries and mutations). No duplicate server state in `useState`.
- TypeScript strict: no `any`, no non-null assertions without a reason, explicit types at module boundaries.
- Small, focused files and functions. Match existing naming and formatting.
- DS components may be improved when a ticket needs it (for example linking error messages to fields). Keep them generic and update their Storybook stories.

## API rules

Read `docs/API-NOTES.md` before any API work. Key points:

- `Content-Type` and `Accept`: `application/vnd.api+json`, with no media type parameters.
- Authenticated state-changing requests send the `XSRF-TOKEN` cookie value in the `X-XSRF-TOKEN` header.
- Error handling branches on `errors[].code`, never on `detail` text. Map `source.pointer` to form fields.
- Some success responses have **no body** (201 registration, 204 no current draft, 204 logout).
- TICKET-003: send only the current step's fields, always send the latest `version`, and update the cache with the response's new version.

## Accessibility (WCAG 2.2 AA)

The existing app is not compliant. New and touched screens must be.

- Semantic HTML, one `h1` per page, logical heading order.
- Every field has a visible label. Instructions (such as password rules) are visible before input and linked with `aria-describedby`.
- Field errors are linked to their field (`aria-invalid`, `aria-describedby`; React Aria `isInvalid` and `FieldError`).
- On a failed submit, show a form-level error summary and move focus to it or to the first invalid field.
- Status changes (pending, saved, errors) are announced with `role="status"` or `role="alert"`, without over-announcing.
- Everything works with the keyboard alone, with a visible focus indicator.
- Pending states are exposed accessibly (for example `isPending` on the button).
- Use correct `autocomplete` values (`email`, `new-password`, `current-password`).
- Add automated accessibility checks (axe) to tests for new screens.

## Testing

- Unit tests for the API client, error mapping, validation, and custom hooks.
- Component tests for forms: validation messages, API error display, pending and success states.
- One Playwright end-to-end test per main flow: register, login, save and resume (including logout and login again).
- Test behaviour from the user's point of view (roles, labels, accessible names), not implementation details.

## Workflow

- Start each ticket in plan mode: propose a plan based on the acceptance criteria and `docs/API-NOTES.md`, and wait for approval before coding.
- Work in small steps. Each meaningful change is its own commit, with a clear message explaining what and why.
- Record notable decisions and trade-offs in `docs/DECISIONS.md`, including what was deliberately not done.
- When a requirement or the contract is ambiguous, say so and ask. Do not guess silently.
- Do not modify tests to make them pass unless the test itself is wrong, and explain why.
