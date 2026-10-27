import { expect, type Page } from '@playwright/test'
import { payOnStripeCheckout } from './checkout'
import { waitForEmails } from './outbox'
import { expectRegistered, fillRegistration, type Party } from './register'
import { onlyBooking, type BookingRow } from './rows'

/* A whole public card registration: form, Stripe, the webhook marking it paid and recording
   Stripe's fee, and the confirmation email. Returns the settled booking. */
export async function bookByCard(page: Page, party: Party): Promise<BookingRow> {
    await fillRegistration(page, party)
    await payOnStripeCheckout(page, `${party.first} ${party.last}`)
    await expectRegistered(page)
    await expect.poll(async () => (await onlyBooking()).stripeFeeCents).not.toBeNull()
    await waitForEmails(1)
    return onlyBooking()
}
