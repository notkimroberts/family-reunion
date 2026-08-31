import { dbg } from '$lib/server/debug'
import { renderDonationReceipt, type DonationReceiptData } from '../templates'
import { send } from './_resend'

/* Sends the receipt for a standalone gift. Pass idempotencyKey (`donation/<id>`) so a redelivered
   Stripe webhook cannot thank the same donor twice. */
export async function sendDonationReceipt(
    to: string,
    data: DonationReceiptData,
    idempotencyKey?: string,
): Promise<void> {
    dbg.email('sendDonationReceipt to=%s amount=%d', to, data.amountCents)
    const { subject, text, html } = renderDonationReceipt(data)
    await send({ to, subject, text, html, idempotencyKey })
}
