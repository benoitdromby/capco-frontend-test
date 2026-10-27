import { afterEach, describe, expect, it } from 'vitest'

import { csrfHeaders } from './csrf'

afterEach(() => {
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('csrfHeaders', () => {
  it('returns no header when the cookie is absent', () => {
    expect(csrfHeaders()).toEqual({})
  })

  it('reads the token from the XSRF-TOKEN cookie', () => {
    document.cookie = 'XSRF-TOKEN=abc-123'
    expect(csrfHeaders()).toEqual({ 'X-XSRF-TOKEN': 'abc-123' })
  })

  it('decodes a percent-encoded cookie value', () => {
    document.cookie = `XSRF-TOKEN=${encodeURIComponent('abc/123+xyz')}`
    expect(csrfHeaders()).toEqual({ 'X-XSRF-TOKEN': 'abc/123+xyz' })
  })
})
