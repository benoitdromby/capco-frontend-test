import { ApiError, parseApiErrorResponse } from './errors'

export interface ApiRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Shared JSON:API request helper. Sets the media-type headers once, maps
 * error responses to a typed ApiError, and resolves an empty 2xx body (used
 * by, for example, the no-body 201 registration response) to `undefined`
 * without calling `response.json()` on it.
 */
export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.api+json',
    ...init.headers,
  }
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/vnd.api+json'
  }

  let response: Response
  try {
    response = await fetch(path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError({
      kind: 'network',
      detail: 'Network request failed.',
    })
  }

  if (!response.ok) {
    throw await parseApiErrorResponse(response)
  }

  const text = await response.text()
  if (!text) {
    // Safe only because callers of a bodiless endpoint request `apiRequest<void>`.
    return undefined as T
  }
  return JSON.parse(text) as T
}
