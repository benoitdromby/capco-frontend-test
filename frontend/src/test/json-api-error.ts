import { HttpResponse } from 'msw'

/**
 * Builds a one-error JSON:API error response for an MSW handler, matching
 * the shape `docs/API-NOTES.md` documents (`errors[].code`/`detail`/`source.pointer`).
 * Covers the single-error case used by nearly every test; a handler needing
 * more than one error entry in the same response still builds it by hand.
 */
export function jsonApiError(
  status: number,
  code: string,
  detail?: string,
  options?: { pointer?: string; headers?: HeadersInit },
) {
  return HttpResponse.json(
    {
      errors: [
        {
          status: String(status),
          code,
          ...(detail !== undefined ? { detail } : {}),
          ...(options?.pointer ? { source: { pointer: options.pointer } } : {}),
        },
      ],
    },
    { status, headers: options?.headers },
  )
}
