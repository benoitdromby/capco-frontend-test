import { expect, test, type Page } from '@playwright/test'

function uniqueEmail(): string {
  return `login-${crypto.randomUUID()}@example.com`
}

async function registerThroughUi(page: Page, email: string) {
  await page.goto('/create-account')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Secret!1')
  await page.getByLabel('Confirm password').fill('Secret!1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Account created' }),
  ).toBeVisible()
}

test('a registered applicant can sign in and reach their journey', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerThroughUi(page, email)

  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('Secret!1')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Start your KYC application' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/applications\/current/)
  await expect(page).toHaveTitle('Your application - KYC Workspace')
})

test('an incorrect password shows a generic error and stays on sign-in', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerThroughUi(page, email)

  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('WrongPassword!1')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Invalid email or password')
  await expect(page).toHaveURL(/\/sign-in/)
})
