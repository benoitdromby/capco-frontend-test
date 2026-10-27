function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined
}

/**
 * Header for an authenticated, state-changing request. Reads the token from
 * the cookie at request time (set after sign-in) rather than keeping it in
 * memory, so it survives a page reload. Returns {} when absent so a caller
 * can always spread the result into its headers.
 */
export function csrfHeaders(): Record<string, string> {
  const token = readCookie('XSRF-TOKEN')
  return token ? { 'X-XSRF-TOKEN': token } : {}
}
