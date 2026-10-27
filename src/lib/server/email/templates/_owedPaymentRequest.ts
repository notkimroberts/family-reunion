import { ZELLE_RECIPIENT } from '$lib/general/constants'
import { OWED_CARD_PITCH, owedOtherWays } from '$lib/general/scamSafety'
import { formatPrice } from '$lib/utils'
import { actionCallout } from './_actionCallout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import { primaryButton } from './_primaryButton'
import type { AmountDue } from './types'

/* The request for money owed on a paid booking, leading with the card.

   The card is the route that settles itself: the webhook marks the place paid and emails the
   receipt, while Zelle and checks wait for an organizer to notice the money and mark it by hand. So
   the box carries one button, straight to /register/pay, and the other two ways follow it in a
   smaller line. The words are scamSafety's, shared with the registrant's page. No Zelle QR code here:
   a second big block would compete with the button. */
export function owedPaymentRequest(amountDue: AmountDue): {
    textLines: string[]
    html: string
    preheader: string
} {
    const { muted, actionText, fontStack } = emailThemeValue
    const owed = `$${formatPrice(amountDue.netCents)}`
    const byCard = `$${formatPrice(amountDue.cardTotalCents)}`
    const title = `Payment needed: ${owed}`
    const feeNote = `${byCard} includes the card processing fee.`
    const otherWays = owedOtherWays(amountDue.netCents, ZELLE_RECIPIENT)

    const button = `<div style="margin:16px 0 0 0;">${primaryButton(amountDue.payUrl, `Pay ${byCard} by card`)}</div>
      <p style="margin:10px 0 0 0;font-family:${fontStack};font-size:13px;line-height:1.5;text-align:center;color:${actionText};">${escapeHtml(feeNote)}</p>`

    return {
        /* Capitals are the only emphasis plain text has; the link sits on its own line so every
           client makes it tappable. */
        textLines: [
            `PAYMENT NEEDED: ${owed}.`,
            `${OWED_CARD_PITCH} ${feeNote}`,
            amountDue.payUrl,
            '',
            otherWays,
            '',
        ],
        html: `${actionCallout(title, OWED_CARD_PITCH, button)}
<p style="margin:0 0 24px 0;font-family:${fontStack};font-size:13px;line-height:1.6;color:${muted};">${escapeHtml(otherWays)}</p>`,
        preheader: `${title}. Pay by card in a minute from the link inside.`,
    }
}
