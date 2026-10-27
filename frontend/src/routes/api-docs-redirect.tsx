import { href, redirect } from 'react-router'

export function clientLoader() {
  return redirect(href('/api-docs'))
}
