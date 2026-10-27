import { expect, test } from '@playwright/test'
import {
    addPersonAsAdmin,
    adminPage,
    cancelBookingAsAdmin,
    enterPaperRegistration,
    openBooking,
    payLinkFrom,
} from '../support/admin'
import { cancelOnStripeCheckout, payOnStripeCheckout } from '../support/checkout'
import { bookByCard } from '../support/flows'
import { cardPrice, usd } from '../support/money'
import { expectPanelAddsUp, readMoneyPanel } from '../support/moneyPanel'
import { waitForEmails } from '../support/outbox'
import { recordOutcome } from '../support/outcome'
import { fillRegistration } from '../support/register'
import { gifts, membersOf, onlyBooking } from '../support/rows'
import { ADULT_CENTS, CHILD_CENTS, resetAndSeed, type SeededEvent } from '../support/seed'
import { chargeFacts } from '../support/stripe'

let seeded: SeededEvent

test.beforeEach(async () => {
    seeded = await resetAndSeed()
})

/* Cancelling a card booking that carried a gift refunds the places and keeps the gift: Stripe
   refunds charges, not line items, so the refund must be LESS than the charge. The fee is not
   returned by Stripe, and the panel reports it as lost. */
test('cancel a card booking with a gift: places refunded, gift kept', async ({ page, browser }) => {
    const booking = await bookByCard(page, {
        first: 'Pia',
        last: 'Cancel',
        email: 'pia@example.com',
        guests: [{ first: 'Quin', last: 'Cancel', tier: 'Child', shirt: 'YL' }],
        giftCents: 2500,
    })
    const places = cardPrice(ADULT_CENTS) + cardPrice(CHILD_CENTS)

    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await cancelBookingAsAdmin(admin)

    await expect.poll(async () => (await onlyBooking()).status).toBe('refunded')
    await expect
        .poll(async () => (await chargeFacts(booking.stripePaymentIntentId ?? '')).refundedCents)
        .toBe(places)
    const charge = await chargeFacts(booking.stripePaymentIntentId ?? '')
    const [gift] = await gifts()
    const emails = await waitForEmails(2)
    const panel = await readMoneyPanel(admin, seeded.eventId)

    expect(charge.amountCents).toBe(places + 2500)
    expect(gift.status).toBe('paid')
    expect(emails[1].text).toContain(usd(places))
    expect(emails[1].text).toContain(`Your gift of ${usd(2500)} is not included`)
    expectPanelAddsUp(panel)
    expect(panel.gifts).toBe(2500)
    expect(panel.registrations).toBe(0)
    expect(panel.lostToRefunds).toBe(charge.feeCents)

    await recordOutcome({
        chargedCents: charge.amountCents,
        refundedCents: charge.refundedCents,
        expectedRefundCents: places,
        giftKeptCents: gift.amountCents,
        stripeFeeLostCents: charge.feeCents,
        panelInTheBank: panel.inTheBank,
        panelGifts: panel.gifts,
        panelLostToRefunds: panel.lostToRefunds,
        cancellationEmail: emails[1].subject,
    })
})

/* A booking paid by card plus a person added later who paid at /register/pay: two charges. Cancel
   refunds both in full. */
test('cancel a booking with two card charges refunds both', async ({ page, browser }) => {
    const booking = await bookByCard(page, { first: 'Ray', last: 'Two', email: 'ray@example.com' })
    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await addPersonAsAdmin(admin, { first: 'Sam', last: 'Two', tier: 'Adult', shirt: 'XL' })
    const [, owed] = await waitForEmails(2)
    await page.goto(payLinkFrom(owed.text))
    await page.getByRole('button', { name: /^Pay \$/ }).click()
    await payOnStripeCheckout(page, 'Ray Two')
    await expect(page.getByText('Payment received. Thank you!')).toBeVisible({ timeout: 60_000 })
    await waitForEmails(3)
    const sam = (await membersOf(booking.id)).find((member) => member.name === 'Sam Two')

    await openBooking(admin, seeded.eventId, booking.id)
    await cancelBookingAsAdmin(admin)
    await expect.poll(async () => (await onlyBooking()).status).toBe('refunded')

    const first = await chargeFacts(booking.stripePaymentIntentId ?? '')
    const second = await chargeFacts(sam?.stripePaymentIntentId ?? '')
    const emails = await waitForEmails(4)
    expect(first.refundedCents).toBe(first.amountCents)
    expect(second.refundedCents).toBe(second.amountCents)
    expect(emails[3].text).toContain(usd(first.amountCents + second.amountCents))

    await recordOutcome({
        firstChargeCents: first.amountCents,
        firstRefundedCents: first.refundedCents,
        secondChargeCents: second.amountCents,
        secondRefundedCents: second.refundedCents,
        emailsSent: emails.length,
        cancellationEmail: emails[3].subject,
    })
})

/* A booking paid by check, plus a person added later who paid by card. Cancelling refunds the card
   charge through Stripe and leaves the rest to the organizers — and the email says which is which. */
test('cancel a check booking with a card-paid addition: mixed refund', async ({
    page,
    browser,
}) => {
    const admin = await adminPage(browser)
    await enterPaperRegistration(
        admin,
        seeded.eventId,
        { first: 'Tia', last: 'Mixed', email: 'tia@example.com' },
        'paid',
    )
    const booking = await onlyBooking()
    await waitForEmails(1)
    await openBooking(admin, seeded.eventId, booking.id)
    await addPersonAsAdmin(admin, { first: 'Uma', last: 'Mixed', tier: 'Child', shirt: 'YM' })
    const [, owed] = await waitForEmails(2)
    await page.goto(payLinkFrom(owed.text))
    await page.getByRole('button', { name: /^Pay \$/ }).click()
    await payOnStripeCheckout(page, 'Tia Mixed')
    await expect(page.getByText('Payment received. Thank you!')).toBeVisible({ timeout: 60_000 })
    await waitForEmails(3)
    const uma = (await membersOf(booking.id)).find((member) => member.name === 'Uma Mixed')

    await openBooking(admin, seeded.eventId, booking.id)
    await cancelBookingAsAdmin(admin)
    await expect.poll(async () => (await onlyBooking()).status).toBe('refunded')

    const card = await chargeFacts(uma?.stripePaymentIntentId ?? '')
    const emails = await waitForEmails(4)
    const total = ADULT_CENTS + cardPrice(CHILD_CENTS)
    expect(card.refundedCents).toBe(cardPrice(CHILD_CENTS))
    expect(emails[3].text).toContain('Refunded to your card')
    expect(emails[3].text).toContain(usd(cardPrice(CHILD_CENTS)))
    expect(emails[3].text).toContain('To be refunded by the organizers')
    expect(emails[3].text).toContain(usd(total - cardPrice(CHILD_CENTS)))

    await recordOutcome({
        checkPaidCents: ADULT_CENTS,
        cardChargeCents: card.amountCents,
        cardRefundedCents: card.refundedCents,
        byHandRefundCents: total - card.refundedCents,
        cancellationEmail: emails[3].subject,
    })
})

/* A checkout abandoned at Stripe, then cancelled: nothing was paid, nothing is refunded, and the
   email says so. */
test('cancel an unpaid booking: nothing to refund', async ({ page, browser }) => {
    await fillRegistration(page, { first: 'Val', last: 'Unpaid', email: 'val@example.com' })
    await cancelOnStripeCheckout(page)
    const booking = await onlyBooking()

    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await cancelBookingAsAdmin(admin)
    await expect.poll(async () => (await onlyBooking()).status).toBe('refunded')

    const [email] = await waitForEmails(1)
    expect(email.text).toContain('No payment had been received, so there is nothing to refund.')

    await recordOutcome({ status: 'refunded', emailsSent: 1, cancellationEmail: email.subject })
})

/* A waived (comped) paper booking, cancelled: nothing was paid. */
test('cancel a waived booking', async ({ browser }) => {
    const admin = await adminPage(browser)
    await enterPaperRegistration(
        admin,
        seeded.eventId,
        { first: 'Wes', last: 'Waived', email: 'wes@example.com' },
        'waived',
    )
    const booking = await onlyBooking()
    await waitForEmails(1)
    await openBooking(admin, seeded.eventId, booking.id)
    await cancelBookingAsAdmin(admin)
    await expect.poll(async () => (await onlyBooking()).status).toBe('refunded')

    const emails = await waitForEmails(2)
    expect(emails[1].text).not.toContain('Refunded to your card')

    await recordOutcome({
        status: 'refunded',
        emailsSent: emails.length,
        cancellationEmail: emails[1].subject,
    })
})
