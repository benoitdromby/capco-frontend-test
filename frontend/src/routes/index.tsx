import { href, redirect } from 'react-router'

export function clientLoader() {
  return redirect(href('/create-account'))
}

export default function IndexRoute() {
  return null
}
