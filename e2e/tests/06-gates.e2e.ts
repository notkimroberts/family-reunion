import { expect, test } from '@playwright/test'
import { payOnStripeCheckout } from '../support/checkout'
import { E2E_PREVIEW_KEY } from '../support/env'
import { waitForEmails } from '../support/outbox'
import { recordOutcome } from '../support/outcome'
import { expectRegistered, fillRegistration } from '../support/register'
import { onlyBooking } from '../support/rows'
import { resetAndSeed } from '../support/seed'

const DAY_MS = 24 * 60 * 60 * 1000

/* Before the opening date the form is hidden, and the preview link opens it for one browser. A tester
   registers and pays through it like anyone else. */
test('before opening: no form, but the preview link registers', async ({ page, browser }) => {
    await resetAndSeed({ opensAt: new Date(Date.now() + 7 * DAY_MS) })

    const stranger = await browser.newPage()
    await stranger.goto('/register')
    await expect(stranger.getByText('Registration opens soon')).toBeVisible()
    await expect(stranger.getByRole('button', { name: 'Save your details' })).toHaveCount(0)

    await fillRegistration(
        page,
        { first: 'Gil', last: 'Preview', email: 'gil@example.com' },
        `/register?preview=${E2E_PREVIEW_KEY}`,
    )
    await payOnStripeCheckout(page, 'Gil Preview')
    await expectRegistered(page)
    await expect.poll(async () => (await onlyBooking()).status).toBe('paid')
    await waitForEmails(1)

    await recordOutcome({
        strangerSeesForm: false,
        previewBookingStatus: (await onlyBooking()).status,
    })
})

/* Past the lock date the form is replaced by a closed notice. */
test('after the lock date: registration is closed', async ({ page }) => {
    await resetAndSeed({ lockDate: new Date(Date.now() - DAY_MS) })

    await page.goto('/register')
    await expect(page.getByText('Registration for this reunion has closed.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save your details' })).toHaveCount(0)

    await recordOutcome({ formShown: false })
})
