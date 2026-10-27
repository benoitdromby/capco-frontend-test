export type ApiErrorKind =
  | 'validation'
  | 'malformed'
  | 'invalidCredentials'
  | 'unauthenticated'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'unprocessable'
  | 'rateLimited'
  | 'server'
  | 'network'
  | 'unexpected'

export interface ApiFieldError {
  field: string
  code: string
  detail: string
}

export interface ApiErrorInit {
  kind: ApiErrorKind
  status?: number
  code?: string
  detail?: string
  fieldErrors?: ApiFieldError[]
  retryAfterSeconds?: number
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly code?: string
  readonly detail?: string
  readonly fieldErrors?: ApiFieldError[]
  readonly retryAfterSeconds?: number

  constructor(init: ApiErrorInit) {
    super(init.detail ?? init.kind)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.detail = init.detail
    this.fieldErrors = init.fieldErrors
    this.retryAfterSeconds = init.retryAfterSeconds
  }
}

// Maps the stable `errors[].code` from docs/API-NOTES.md's error model to a kind.
// Typed with `| undefined` explicitly so an unrecognized code falls through to
// 'unexpected' rather than being silently treated as a valid kind.
const codeToKind: Record<string, ApiErrorKind | undefined> = {
  'validation-failed': 'validation',
  'malformed-document': 'malformed',
  'invalid-credentials': 'invalidCredentials',
  'authentication-required': 'unauthenticated',
  'access-denied': 'forbidden',
  'application-not-found': 'notFound',
  'email-already-registered': 'conflict',
  'form-version-conflict': 'conflict',
  'unprocessable-form': 'unprocessable',
  'rate-limited': 'rateLimited',
  'internal-error': 'server',
  'submission-unavailable': 'server',
}

interface JsonApiErrorEntry {
  code?: string
  detail?: string
  source?: { pointer?: string }
}

interface JsonApiErrorDocument {
  errors?: JsonApiErrorEntry[]
}

function parseRetryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get('Retry-After')
  if (!header) return undefined
  const seconds = Number.parseInt(header, 10)
  return Number.isNaN(seconds) ? undefined : Math.max(1, seconds)
}

async function readErrorDocument(
  response: Response,
): Promise<JsonApiErrorDocument | undefined> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as JsonApiErrorDocument
  } catch {
    return undefined
  }
}

export async function parseApiErrorResponse(
  response: Response,
): Promise<ApiError> {
  const body = await readErrorDocument(response)
  const entries = body?.errors
  if (!entries || entries.length === 0) {
    return new ApiError({ kind: 'unexpected', status: response.status })
  }

  const [first] = entries
  if (first.code === 'validation-failed') {
    const fieldErrors = entries.flatMap((entry): ApiFieldError[] => {
      const pointer = entry.source?.pointer
      if (!pointer) return []
      return [
        {
          field: pointer.replace('/data/attributes/', ''),
          code: entry.code ?? 'validation-failed',
          detail: entry.detail ?? '',
        },
      ]
    })
    return new ApiError({
      kind: 'validation',
      status: response.status,
      code: first.code,
      detail: first.detail,
      fieldErrors,
    })
  }

  const kind = (first.code ? codeToKind[first.code] : undefined) ?? 'unexpected'
  return new ApiError({
    kind,
    status: response.status,
    code: first.code,
    detail: first.detail,
    retryAfterSeconds:
      kind === 'rateLimited' ? parseRetryAfterSeconds(response) : undefined,
  })
}

/** True for a missing or no-longer-valid session — the session-expired notice's trigger. */
export function isSessionExpiredError(error: ApiError): boolean {
  return error.kind === 'unauthenticated' || error.kind === 'forbidden'
}
