import { expect, test } from '@playwright/test'
import { adminPage, enterPaperRegistration, openBooking } from '../support/admin'
import { cancelOnStripeCheckout } from '../support/checkout'
import { cardPrice, usd } from '../support/money'
import { expectPanelAddsUp, readMoneyPanel } from '../support/moneyPanel'
import { waitForEmails } from '../support/outbox'
import { recordOutcome } from '../support/outcome'
import { fillRegistration } from '../support/register'
import { membersOf, onlyBooking } from '../support/rows'
import { ADULT_CENTS, resetAndSeed, type SeededEvent } from '../support/seed'

let seeded: SeededEvent

test.beforeEach(async () => {
    seeded = await resetAndSeed()
})

/* A mailed-in form paid by check: the tier price with no card fee, no Stripe ids, and an email that
   says the payment was received — not that it "has gone through", which reads as a card. */
test('paper entry paid by check', async ({ browser }) => {
    const admin = await adminPage(browser)
    await enterPaperRegistration(
        admin,
        seeded.eventId,
        { first: 'Abe', last: 'Paper', email: 'abe@example.com' },
        'paid',
    )
    const booking = await onlyBooking()
    const [abe] = await membersOf(booking.id)
    const [email] = await waitForEmails(1)
    const panel = await readMoneyPanel(admin, seeded.eventId)

    expect(booking).toMatchObject({
        status: 'paid',
        stripeSessionId: null,
        stripePaymentIntentId: null,
    })
    expect(abe).toMatchObject({ priceCents: ADULT_CENTS, cardFeeCents: 0 })
    expect(email.text).toContain('we have received your payment')
    expect(email.text).not.toContain('has gone through')
    expect(email.text).toContain(usd(ADULT_CENTS))
    expectPanelAddsUp(panel)
    expect(panel.registrations).toBe(ADULT_CENTS)
    expect(panel.stripeFees).toBe(0)

    await recordOutcome({
        storedPriceCents: abe.priceCents,
        cardFeeCents: abe.cardFeeCents,
        panelInTheBank: panel.inTheBank,
        email: email.subject,
    })
})

/* A paper form whose check has not arrived: the email asks for the amount, and marking it paid later
   sends a second email that says it was received. */
test('paper entry pending, then marked paid', async ({ browser }) => {
    const admin = await adminPage(browser)
    await enterPaperRegistration(
        admin,
        seeded.eventId,
        { first: 'Bo', last: 'Later', email: 'bo@example.com' },
        'pending',
    )
    const booking = await onlyBooking()
    const [pendingEmail] = await waitForEmails(1)
    expect(pendingEmail.text).toContain('It is not complete until payment is received.')
    expect(pendingEmail.text).toContain(usd(ADULT_CENTS))
    const pendingPanel = await readMoneyPanel(admin, seeded.eventId)
    expect(pendingPanel.outstanding).toBe(ADULT_CENTS)

    await openBooking(admin, seeded.eventId, booking.id)
    await admin.getByRole('button', { name: 'Edit registration' }).click()
    await admin.locator('#editStatus').selectOption('paid')
    await admin.getByRole('button', { name: 'Save changes' }).click()
    await expect.poll(async () => (await onlyBooking()).status).toBe('paid')

    const emails = await waitForEmails(2)
    expect(emails[1].text).not.toContain('It is not complete until payment is received.')
    const paidPanel = await readMoneyPanel(admin, seeded.eventId)
    expectPanelAddsUp(paidPanel)
    expect(paidPanel.outstanding).toBe(0)
    expect(paidPanel.registrations).toBe(ADULT_CENTS)

    await recordOutcome({
        outstandingWhilePending: pendingPanel.outstanding,
        registrationsWhenPaid: paidPanel.registrations,
        emailsSent: emails.length,
        pendingEmail: pendingEmail.subject,
        paidEmail: emails[1].subject,
    })
})

/* A public card checkout abandoned at Stripe, then settled by check and marked paid by hand. The card
   price snapshotted at checkout must go back to the tier price: nobody paid a card fee. */
test('abandoned card checkout settled by check drops the card fee', async ({ page, browser }) => {
    await fillRegistration(page, { first: 'Cy', last: 'Check', email: 'cy@example.com' })
    await cancelOnStripeCheckout(page)
    const booking = await onlyBooking()
    const [before] = await membersOf(booking.id)
    expect(before).toMatchObject({
        priceCents: cardPrice(ADULT_CENTS),
        cardFeeCents: cardPrice(ADULT_CENTS) - ADULT_CENTS,
    })

    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await admin.getByRole('button', { name: 'Edit registration' }).click()
    await admin.locator('#editStatus').selectOption('paid')
    await admin.getByRole('button', { name: 'Save changes' }).click()
    await expect.poll(async () => (await onlyBooking()).status).toBe('paid')

    const [after] = await membersOf(booking.id)
    const [email] = await waitForEmails(1)
    expect(after).toMatchObject({ priceCents: ADULT_CENTS, cardFeeCents: 0 })
    /* Their first email: nothing was sent when they abandoned Stripe. */
    expect(email.subject).toMatch(/^Registration confirmed:/)
    expect(email.text).not.toContain('has gone through')
    expect(email.text).toContain(usd(ADULT_CENTS))

    await recordOutcome({
        snapshotPriceCents: before.priceCents,
        priceAfterMarkedPaidCents: after.priceCents,
        cardFeeAfterCents: after.cardFeeCents,
        email: email.subject,
    })
})

/* A comped paper booking: no price owed, and the email says there is nothing to pay. */
test('paper entry waived', async ({ browser }) => {
    const admin = await adminPage(browser)
    await enterPaperRegistration(
        admin,
        seeded.eventId,
        { first: 'Di', last: 'Comp', email: 'di@example.com' },
        'waived',
    )
    const [email] = await waitForEmails(1)
    expect(email.text).toContain('there is nothing to pay')
    expect((await onlyBooking()).status).toBe('waived')

    await recordOutcome({ status: 'waived', email: email.subject })
})
