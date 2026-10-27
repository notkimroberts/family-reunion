import { expect, test } from '@playwright/test'
import { cancelOnStripeCheckout, payOnStripeCheckout } from '../support/checkout'
import { E2E_BASE_URL } from '../support/env'
import { cardPrice, usd } from '../support/money'
import { readOutbox, waitForEmails } from '../support/outbox'
import { recordOutcome } from '../support/outcome'
import { expectRegistered, fillRegistration } from '../support/register'
import { gifts, membersOf, onlyBooking } from '../support/rows'
import { ADULT_CENTS, CHILD_CENTS, resetAndSeed } from '../support/seed'
import { chargeFacts, completedEventFor, redeliverEvent, stripe } from '../support/stripe'

test.beforeEach(async () => {
    await resetAndSeed()
})

/* One adult pays by card. The charge, the stored prices, the recorded fee and the email must all
   agree with each other and with an independent gross-up of the tier price. */
test('one adult pays by card', async ({ page }) => {
    await fillRegistration(page, { first: 'Ada', last: 'Card', email: 'ada@example.com' })
    await payOnStripeCheckout(page, 'Ada Card')
    await expectRegistered(page)

    const booking = await onlyBooking()
    await expect.poll(async () => (await onlyBooking()).stripeFeeCents).not.toBeNull()
    const settled = await onlyBooking()
    const [ada] = await membersOf(booking.id)
    const charge = await chargeFacts(settled.stripePaymentIntentId ?? '')
    const expectedCharge = cardPrice(ADULT_CENTS)

    expect(settled.status).toBe('paid')
    expect(charge.amountCents).toBe(expectedCharge)
    expect(ada.priceCents).toBe(expectedCharge)
    expect(ada.cardFeeCents).toBe(expectedCharge - ADULT_CENTS)
    expect(settled.stripeFeeCents).toBe(charge.feeCents)

    const [email] = await waitForEmails(1)
    expect(email.to).toBe('ada@example.com')
    expect(email.text).toContain(usd(expectedCharge))
    expect(email.idempotencyKey).toBe(`confirm/${booking.id}`)

    await recordOutcome({
        status: settled.status,
        tierCents: ADULT_CENTS,
        expectedChargeCents: expectedCharge,
        stripeChargeCents: charge.amountCents,
        storedPriceCents: ada.priceCents,
        storedCardFeeCents: ada.cardFeeCents,
        stripeFeeCents: charge.feeCents,
        recordedStripeFeeCents: settled.stripeFeeCents,
        emailSubject: email.subject,
    })
})

/* An adult, a child and a $50 gift on one charge. Places are grossed up; the gift is charged at face
   value, and the email names it. */
test('adult, child and a gift on one charge', async ({ page }) => {
    await fillRegistration(page, {
        first: 'Bea',
        last: 'Family',
        email: 'bea@example.com',
        guests: [{ first: 'Cal', last: 'Family', tier: 'Child', shirt: 'YM' }],
        giftCents: 5000,
    })
    await payOnStripeCheckout(page, 'Bea Family')
    await expectRegistered(page)

    await expect.poll(async () => (await onlyBooking()).stripeFeeCents).not.toBeNull()
    const booking = await onlyBooking()
    const members = await membersOf(booking.id)
    const [gift] = await gifts()
    const charge = await chargeFacts(booking.stripePaymentIntentId ?? '')
    const places = cardPrice(ADULT_CENTS) + cardPrice(CHILD_CENTS)

    expect(members.map((member) => member.priceCents).sort()).toEqual(
        [cardPrice(ADULT_CENTS), cardPrice(CHILD_CENTS)].sort(),
    )
    expect(charge.amountCents).toBe(places + 5000)
    expect(gift).toMatchObject({ status: 'paid', amountCents: 5000, registrationId: booking.id })
    expect(booking.stripeFeeCents).toBe(charge.feeCents)

    const emails = await waitForEmails(1)
    expect(emails[0].text).toContain(usd(places + 5000))
    expect(emails[0].text).toContain(usd(5000))

    await recordOutcome({
        placesCents: places,
        giftCents: 5000,
        stripeChargeCents: charge.amountCents,
        stripeFeeCents: charge.feeCents,
        recordedStripeFeeCents: booking.stripeFeeCents,
        giftStatus: gift.status,
        emailsSent: emails.length,
    })
})

/* Backing out at Stripe: nothing charged, the booking stays pending, the form comes back filled in
   and no email is sent. */
test('cancel at Stripe keeps the form and charges nothing', async ({ page }) => {
    await fillRegistration(page, { first: 'Dee', last: 'Back', email: 'dee@example.com' })
    await cancelOnStripeCheckout(page)

    await expect(page.getByText('Checkout cancelled — nothing was charged.')).toBeVisible()
    await expect(page.getByText('We kept what you entered.')).toBeVisible()
    const booking = await onlyBooking()
    expect(booking.status).toBe('pending')
    expect(booking.stripePaymentIntentId).toBeNull()
    const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId ?? '')
    expect(session.payment_status).toBe('unpaid')
    expect(await readOutbox()).toHaveLength(0)

    await recordOutcome({
        status: booking.status,
        stripeSessionPaymentStatus: session.payment_status,
        emailsSent: 0,
    })
})

/* Stripe redelivers checkout.session.completed. The conditional pending → paid update must match
   nothing: no second email, no second fee. */
test('a redelivered webhook sends nothing twice', async ({ page }) => {
    await fillRegistration(page, { first: 'Eve', last: 'Twice', email: 'eve@example.com' })
    await payOnStripeCheckout(page, 'Eve Twice')
    await expectRegistered(page)
    await waitForEmails(1)
    await expect.poll(async () => (await onlyBooking()).stripeFeeCents).not.toBeNull()
    const before = await onlyBooking()

    const status = await redeliverEvent(
        await completedEventFor(before.stripeSessionId ?? ''),
        `${E2E_BASE_URL}/api/webhooks/stripe`,
    )
    expect(status).toBe(200)

    const after = await onlyBooking()
    expect((await readOutbox()).length).toBe(1)
    expect(after.stripeFeeCents).toBe(before.stripeFeeCents)

    await recordOutcome({
        redeliveryStatus: status,
        emailsAfterRedelivery: (await readOutbox()).length,
        feeBefore: before.stripeFeeCents,
        feeAfter: after.stripeFeeCents,
    })
})
