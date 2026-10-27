import { expect, type Page } from '@playwright/test'
import { payOnStripeCheckout } from './checkout'
import { waitForEmails } from './outbox'
import { expectRegistered, fillRegistration, type Party } from './register'
import { onlyBooking, type BookingRow } from './rows'

/* A whole public card registration: form, Stripe, the webhook marking it paid, and the
   confirmation email. Returns the paid booking. Stripe's fee is checked separately (recordedFee),
   because the app may not record it — see recordedFee. */
export async function bookByCard(page: Page, party: Party): Promise<BookingRow> {
    await fillRegistration(page, party)
    await payOnStripeCheckout(page, `${party.first} ${party.last}`)
    await expectRegistered(page)
    await expect.poll(async () => (await onlyBooking()).status).toBe('paid')
    await waitForEmails(1)
    return onlyBooking()
}

/* registrations.stripe_fee_cents once the webhook has had a chance to write it, or null.

   Stripe attaches the balance transaction to a charge about three seconds AFTER
   checkout.session.completed (charge.succeeded has balance_transaction: null; a later charge.updated
   carries it), so a webhook that reads the fee while handling checkout.session.completed can find
   none; the webhook now records it from charge.updated, which this waits for. */
export async function recordedFee(): Promise<number | null> {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
        const fee = (await onlyBooking()).stripeFeeCents
        if (fee !== null) {
            return fee
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
    return null
}
