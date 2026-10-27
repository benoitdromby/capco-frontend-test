import { expect, test } from '@playwright/test'

test('application form lays out actions without forwarding style props to the DOM', async ({
  page,
}) => {
  const reactWarnings: string[] = []
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      message.text().includes('justifyContent')
    ) {
      reactWarnings.push(message.text())
    }
  })

  const email = `stack-layout-${crypto.randomUUID()}@example.com`
  await page.goto('/create-account')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Secret!1')
  await page.getByLabel('Confirm password').fill('Secret!1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Account created' }),
  ).toBeVisible()

  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('Secret!1')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Personal details' }),
  ).toBeVisible()

  // Continue sits inside a Save/Continue group, itself inside the Back/group
  // row that carries the justify-content style — two ancestor levels up.
  const actions = page
    .getByRole('button', { name: 'Continue' })
    .locator('xpath=../..')
  await expect(actions).toHaveCSS('justify-content', 'space-between')
  expect(reactWarnings).toEqual([])
})
