import { expect, test } from '@playwright/test'
import {
    addPersonAsAdmin,
    adminPage,
    openBooking,
    payLinkFrom,
    personCardFor,
    settleOwedPlace,
} from '../support/admin'
import { payOnStripeCheckout } from '../support/checkout'
import { bookByCard, recordedFee } from '../support/flows'
import { cardPrice, usd } from '../support/money'
import { waitForEmails } from '../support/outbox'
import { recordOutcome } from '../support/outcome'
import { membersOf, onlyBooking } from '../support/rows'
import { ADULT_CENTS, CHILD_CENTS, resetAndSeed, type SeededEvent } from '../support/seed'
import { chargeFacts } from '../support/stripe'

let seeded: SeededEvent

test.beforeEach(async () => {
    seeded = await resetAndSeed()
})

/* An organizer adds a child to a booking already paid by card. The child owes the tier price, the
   booking reads Partly paid, and the email asks for exactly that and links to /register/pay. The
   registrant pays there by card: the child's place becomes the card price, the second charge's fee
   is ADDED to the booking's, and they are emailed again. */
test('person added to a paid booking pays the rest by card', async ({ page, browser }) => {
    const booking = await bookByCard(page, { first: 'Gus', last: 'Owe', email: 'gus@example.com' })
    const firstFee = await recordedFee()

    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await addPersonAsAdmin(admin, { first: 'Hal', last: 'Owe', tier: 'Child', shirt: 'YM' })
    await expect(admin.getByText('Partly paid').first()).toBeVisible()

    const added = (await membersOf(booking.id)).find((member) => member.name === 'Hal Owe')
    expect(added).toMatchObject({ paymentDue: true, priceCents: CHILD_CENTS, cardFeeCents: 0 })
    const [, owedEmail] = await waitForEmails(2)
    expect(owedEmail.text).toContain(`PAYMENT NEEDED: ${usd(CHILD_CENTS)}`)
    expect(owedEmail.text).not.toContain('has gone through')

    await page.goto(payLinkFrom(owedEmail.text))
    await page.getByRole('button', { name: /^Pay \$/ }).click()
    await payOnStripeCheckout(page, 'Gus Owe')
    await expect(page.getByText('Payment received. Thank you!')).toBeVisible({ timeout: 60_000 })

    await expect
        .poll(
            async () => (await membersOf(booking.id)).find((m) => m.name === 'Hal Owe')?.paymentDue,
        )
        .toBe(false)
    const paid = (await membersOf(booking.id)).find((member) => member.name === 'Hal Owe')
    const secondCharge = await chargeFacts(paid?.stripePaymentIntentId ?? '')
    const firstCharge = await chargeFacts(booking.stripePaymentIntentId ?? '')
    const after = await onlyBooking()
    const emails = await waitForEmails(3)

    expect(secondCharge.amountCents).toBe(cardPrice(CHILD_CENTS))
    expect(paid).toMatchObject({
        priceCents: cardPrice(CHILD_CENTS),
        cardFeeCents: cardPrice(CHILD_CENTS) - CHILD_CENTS,
    })
    expect(after.status).toBe('paid')
    expect
        .soft(after.stripeFeeCents, 'both charges’ fees are added to the booking')
        .toBe(firstCharge.feeCents + secondCharge.feeCents)
    expect(emails[2].text).not.toContain('PAYMENT NEEDED')

    await recordOutcome({
        firstChargeCents: firstCharge.amountCents,
        owedNetCents: CHILD_CENTS,
        owedEmailAsks: usd(CHILD_CENTS),
        secondChargeCents: secondCharge.amountCents,
        expectedSecondChargeCents: cardPrice(CHILD_CENTS),
        childStoredPriceCents: paid?.priceCents ?? null,
        bookingFeeBefore: firstFee,
        bookingFeeAfter: after.stripeFeeCents,
        stripeFeesSum: firstCharge.feeCents + secondCharge.feeCents,
        emailsSent: emails.length,
    })
})

/* The added person pays by Zelle or check, recorded by the organizer: the place keeps the tier price
   (no card fee), the flag clears and the registrant is told it was received. */
test('person added to a paid booking pays by Zelle or check', async ({ page, browser }) => {
    const booking = await bookByCard(page, {
        first: 'Ida',
        last: 'Zelle',
        email: 'ida@example.com',
    })
    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await addPersonAsAdmin(admin, { first: 'Jo', last: 'Zelle', tier: 'Adult', shirt: 'L' })
    await waitForEmails(2)

    await settleOwedPlace(admin, 'Paid by Zelle or check')
    await expect
        .poll(
            async () =>
                (await membersOf(booking.id)).find((m) => m.name === 'Jo Zelle')?.settlement,
        )
        .toBe('paid')
    const jo = (await membersOf(booking.id)).find((member) => member.name === 'Jo Zelle')
    const emails = await waitForEmails(3)
    await expect(admin.getByText('Partly paid')).toHaveCount(0)

    expect(jo).toMatchObject({ paymentDue: false, priceCents: ADULT_CENTS, cardFeeCents: 0 })
    expect(emails[2].text).not.toContain('PAYMENT NEEDED')

    await recordOutcome({
        addedPriceCents: jo?.priceCents ?? null,
        settlement: jo?.settlement ?? null,
        paymentDueAfter: jo?.paymentDue ?? null,
        emailsSent: emails.length,
        lastEmailSubject: emails[2].subject,
    })
})

/* The organizer covers the added person's place: price 0, nothing owed, and the email says there is
   nothing to pay. */
test('person added to a paid booking is covered', async ({ page, browser }) => {
    const booking = await bookByCard(page, {
        first: 'Kai',
        last: 'Cover',
        email: 'kai@example.com',
    })
    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await addPersonAsAdmin(admin, { first: 'Lu', last: 'Cover', tier: 'Adult', shirt: 'S' })
    await waitForEmails(2)

    await settleOwedPlace(admin, 'Cover their place')
    await expect
        .poll(
            async () =>
                (await membersOf(booking.id)).find((m) => m.name === 'Lu Cover')?.settlement,
        )
        .toBe('covered')
    const lu = (await membersOf(booking.id)).find((member) => member.name === 'Lu Cover')
    const emails = await waitForEmails(3)

    expect(lu).toMatchObject({ paymentDue: false, priceCents: 0, cardFeeCents: 0 })
    expect(emails[2].text).not.toContain('PAYMENT NEEDED')

    await recordOutcome({
        coveredPriceCents: lu?.priceCents ?? null,
        settlement: lu?.settlement ?? null,
        emailsSent: emails.length,
        lastEmailSubject: emails[2].subject,
    })
})

/* A paid place cannot be removed — nothing here refunds one person — but a place still owed can,
   since nobody paid for it. */
test('removing people: an owed place can go, a paid one cannot', async ({ page, browser }) => {
    const booking = await bookByCard(page, {
        first: 'Max',
        last: 'Remove',
        email: 'max@example.com',
        guests: [{ first: 'Ned', last: 'Remove', tier: 'Adult', shirt: 'M' }],
    })
    const admin = await adminPage(browser)
    await openBooking(admin, seeded.eventId, booking.id)
    await addPersonAsAdmin(admin, { first: 'Oz', last: 'Remove', tier: 'Child', shirt: 'YS' })
    await waitForEmails(2)

    await admin.getByRole('button', { name: 'Edit registration' }).click()
    const nedCard = await personCardFor(admin, 'Ned Remove')
    const ozCard = await personCardFor(admin, 'Oz Remove')
    await expect(nedCard.getByRole('button', { name: 'Remove' })).toBeDisabled()
    await ozCard.getByRole('button', { name: 'Remove' }).click()
    await admin.getByRole('button', { name: 'Save changes' }).click()
    await expect(admin.getByRole('button', { name: 'Edit registration' })).toBeVisible()

    const names = (await membersOf(booking.id)).map((member) => member.name)
    expect(names).toEqual(['Max Remove', 'Ned Remove'])
    const charge = await chargeFacts(booking.stripePaymentIntentId ?? '')
    expect(charge.refundedCents).toBe(0)

    await recordOutcome({
        paidGuestRemoveDisabled: true,
        membersAfter: names.join(', '),
        refundedCents: charge.refundedCents,
        emailsSent: (await waitForEmails(3)).length,
    })
})
