import { expect, test } from '@playwright/test'

function uniqueEmail(): string {
  return `register-${crypto.randomUUID()}@example.com`
}

test('a visitor can register and is sent to sign in, not signed in', async ({
  page,
}) => {
  const email = uniqueEmail()
  await page.goto('/create-account')

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Secret!1')
  await page.getByLabel('Confirm password').fill('Secret!1')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Account created' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome back' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in/)
})

test('registering an already-used email shows a conflict message with a sign-in link', async ({
  page,
}) => {
  const email = uniqueEmail()

  await page.goto('/create-account')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Secret!1')
  await page.getByLabel('Confirm password').fill('Secret!1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Account created' }),
  ).toBeVisible()

  await page.goto('/create-account')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Secret!1')
  await page.getByLabel('Confirm password').fill('Secret!1')
  await page.getByRole('button', { name: 'Create account' }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('already exists')
  await expect(alert.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Account created' }),
  ).not.toBeVisible()
})
