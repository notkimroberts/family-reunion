import { expect, test } from '@playwright/test'
import { payOnStripeCheckout } from '../support/checkout'
import { usd } from '../support/money'
import { waitForEmails } from '../support/outbox'
import { recordOutcome } from '../support/outcome'
import { gifts } from '../support/rows'
import { resetAndSeed } from '../support/seed'
import { chargeFacts } from '../support/stripe'

test.beforeEach(async () => {
    await resetAndSeed()
})

/* A standalone gift at /donate is charged at face value — not grossed up — and its own Stripe fee is
   recorded on the gift. The receipt names the amount. */
test('a standalone gift is charged at face value', async ({ page }) => {
    await page.goto('/donate')
    await page.getByRole('button', { name: '$100.00', exact: true }).click()
    await page.locator('#donorName').fill('Flo Giver')
    await page.locator('#donorEmail').fill('flo@example.com')
    await page.getByRole('button', { name: 'Give $100.00' }).click()
    await payOnStripeCheckout(page, 'Flo Giver')
    await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible()

    await expect.poll(async () => (await gifts())[0]?.status).toBe('paid')
    await new Promise((resolve) => setTimeout(resolve, 10_000))
    const [gift] = await gifts()
    const charge = await chargeFacts(gift.stripePaymentIntentId ?? '')
    const [receipt] = await waitForEmails(1)

    expect(gift).toMatchObject({ status: 'paid', amountCents: 10000, registrationId: null })
    expect(charge.amountCents).toBe(10000)
    expect
        .soft(gift.stripeFeeCents, 'donations.stripe_fee_cents records Stripe’s fee')
        .toBe(charge.feeCents)
    expect(receipt.text).toContain(usd(10000))
    expect(receipt.idempotencyKey).toBe(`donation/${gift.id}`)

    await recordOutcome({
        giftCents: gift.amountCents,
        stripeChargeCents: charge.amountCents,
        stripeFeeCents: charge.feeCents,
        recordedFeeCents: gift.stripeFeeCents,
        receipt: receipt.subject,
    })
})
