import path from 'node:path'

import { expect, test } from '@playwright/test'

function uniqueEmail(): string {
  return `save-resume-${crypto.randomUUID()}@example.com`
}

async function registerAndSignIn(
  page: import('@playwright/test').Page,
  email: string,
) {
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
  await expect(
    page.getByRole('heading', { level: 1, name: 'Start your KYC application' }),
  ).toBeVisible()
}

test('save and resume: load, save, log out, log back in, and reload the saved draft', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerAndSignIn(page, email)

  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Personal details' }),
  ).toBeVisible()

  await page.getByLabel('Name').fill('Jane Doe')
  await page.getByLabel('Date of birth').fill('1990-01-01')
  await page.getByLabel('Country').fill('FR')
  await page.getByLabel('Nationality').fill('FR')
  await page.getByLabel('Email').fill('jane@example.com')
  await page.getByLabel('Phone').fill('+33612345678')
  await page
    .getByRole('checkbox', {
      name: 'I confirm these details are accurate and belong to me.',
    })
    .check()

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/^Saved at/)).toBeVisible()

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Identity and address' }),
  ).toBeVisible()

  await page.getByLabel('Document type').fill('Passport')
  await page.getByLabel('Document number').fill('X1234567')
  await page.getByLabel('Document country').fill('FR')
  await page.getByLabel('Expiry').fill('2030-01-01')
  await page.getByLabel('Street').fill('1 Rue de Paris')
  await page.getByLabel('City').fill('Paris')
  await page.getByLabel('Postal code').fill('75001')
  await page.getByLabel('Residential country').fill('FR')

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(/^Saved at/)).toBeVisible()

  await page
    .getByLabel('Document evidence')
    .setInputFiles(path.join(import.meta.dirname, 'fixtures/test-document.png'))
  await expect(page.getByText('Document evidence provided.')).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/sign-in/)

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('Secret!1')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // The draft has already advanced past its first step, so the API's login
  // href points directly at the in-progress step (confirmed live), not the
  // generic journey entry page — this alone proves the draft and its answers
  // survived logout and a later login, straight from the API.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Identity and address' }),
  ).toBeVisible()
  await expect(page.getByLabel('Document type')).toHaveValue('Passport')
  await expect(page.getByLabel('City')).toHaveValue('Paris')
  await expect(page.getByText('Document evidence provided.')).toBeVisible()
})

test('a stale save conflicts with a change made elsewhere, and Reload recovers', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerAndSignIn(page, email)

  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel('Name').fill('Jane Doe')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/^Saved at/)).toBeVisible()

  const applicationId = page.url().match(/\/applications\/([^/]+)\//)?.[1]
  if (!applicationId) throw new Error('expected an applicationId in the URL')
  const xsrfToken = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'XSRF-TOKEN',
  )?.value
  if (!xsrfToken) throw new Error('expected an XSRF-TOKEN cookie')

  // Simulate a change made elsewhere: save directly against the API with the
  // version the UI already holds, so the server moves ahead of what the UI knows.
  const response = await page.request.patch(
    `/api/v1/applicant-applications/${applicationId}/form`,
    {
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'X-XSRF-TOKEN': xsrfToken,
      },
      data: {
        data: {
          type: 'applicant-application-forms',
          id: applicationId,
          attributes: {
            step: 'personal-details',
            answers: { name: 'Changed Elsewhere' },
            version: 1,
          },
        },
      },
    },
  )
  expect(response.ok()).toBe(true)

  await page.getByLabel('Name').fill('Jane Doe (edited locally)')
  await page.getByRole('button', { name: 'Save' }).click()

  const reloadButton = page.getByRole('button', { name: 'Reload' })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await expect(page.getByLabel('Name')).toHaveValue('Changed Elsewhere')
})

test('a save failure shows a clear error, preserves entered values, and lets the user retry without a false success', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerAndSignIn(page, email)

  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel('Name').fill('Jane Doe')

  // Everything else in this test runs against the real backend; only this one
  // PATCH is intercepted, and only once, so the retry below reaches the real
  // backend and genuinely succeeds — proving retry isn't just "button enabled".
  let interceptedOnce = false
  await page.route('**/api/v1/applicant-applications/*/form', (route) => {
    if (interceptedOnce || route.request().method() !== 'PATCH') {
      return route.continue()
    }
    interceptedOnce = true
    return route.fulfill({
      status: 500,
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        errors: [
          { status: '500', code: 'internal-error', detail: 'Something broke.' },
        ],
      }),
    })
  })

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('alert')).toHaveText('Something broke.')
  await expect(page.getByLabel('Name')).toHaveValue('Jane Doe')
  await expect(page.getByText('Unsaved changes.')).toBeVisible()
  await expect(page.getByText(/^Saved at/)).not.toBeVisible()
  const saveButton = page.getByRole('button', { name: 'Save' })
  await expect(saveButton).toBeEnabled()

  await saveButton.click()
  await expect(page.getByText(/^Saved at/)).toBeVisible()
})

test('an expired session on save shows a clear notice, warns about unsaved changes, and offers a working sign-in link', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerAndSignIn(page, email)

  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel('Name').fill('Jane Doe')

  // Session expiry can't be produced for real against a freshly-logged-in
  // session, so this one PATCH is intercepted to return a 401 — everything
  // else (registration, login, navigation) still runs against the real backend.
  await page.route('**/api/v1/applicant-applications/*/form', (route) => {
    if (route.request().method() !== 'PATCH') return route.continue()
    return route.fulfill({
      status: 401,
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        errors: [
          {
            status: '401',
            code: 'authentication-required',
            detail: 'Sign in to continue.',
          },
        ],
      }),
    })
  })

  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText(/session has expired/i)).toBeVisible()
  await expect(
    page.getByText(/unsaved changes on this page will be lost/i),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/sign-in/)
})

test('Continue is blocked by red, per-field errors when required fields are empty', async ({
  page,
}) => {
  const email = uniqueEmail()
  await registerAndSignIn(page, email)

  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  const nameError = page.getByText('Name is required.')
  await expect(nameError).toBeVisible()
  await expect(nameError).toHaveCSS('color', 'rgb(180, 35, 24)')
  await expect(page.getByLabel('Name')).toBeFocused()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Identity and address' }),
  ).not.toBeVisible()
})
