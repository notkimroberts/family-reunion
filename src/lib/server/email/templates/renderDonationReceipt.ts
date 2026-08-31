import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatPrice, toE164 } from '$lib/utils'
import { emailLayout } from './_emailLayout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import type { DonationReceiptData } from './types'

/* Receipt for a standalone gift. Says the amount and the date and nothing else — a donation buys
   no place, so there is no party table, no management link and nothing for the donor to do next.

   It states plainly that the gift is not tax-deductible. The reunion is a family gathering, not a
   registered charity, and a receipt that looks like a charitable one invites someone to claim it. */
export function renderDonationReceipt(data: DonationReceiptData): {
    subject: string
    text: string
    html: string
} {
    const { border, text: textColor, muted, fontStack } = emailThemeValue
    const amount = `$${formatPrice(data.amountCents)}`

    const text = [
        `Hi ${data.donorName},`,
        '',
        `Thank you for your gift of ${amount} to ${data.eventTitle}.`,
        '',
        'It goes straight into what the reunion costs to put on — the venue, the food and the shirts.',
        '',
        'This is a personal gift to a family reunion, not a charitable donation, so it is not tax-deductible.',
        '',
        `Questions? ${CONTACT_EMAIL} or ${CONTACT_PHONE}`,
    ].join('\n')

    const paragraph = (content: string) =>
        `<p style="margin:0 0 14px 0;font-family:${fontStack};font-size:15px;line-height:1.6;color:${textColor};">${content}</p>`

    const bodyHtml = [
        paragraph(`Thank you, ${escapeHtml(data.donorName)}.`),
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
  <tr>
    <td style="padding:14px 16px;border:1px solid ${border};border-radius:10px;font-family:${fontStack};font-size:15px;color:${textColor};">
      <span style="color:${muted};">Your gift to ${escapeHtml(data.eventTitle)}</span><br>
      <strong style="font-size:24px;">${escapeHtml(amount)}</strong>
    </td>
  </tr>
</table>`,
        paragraph(
            'It goes straight into what the reunion costs to put on — the venue, the food and the shirts.',
        ),
        `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${border};font-family:${fontStack};font-size:13px;line-height:1.6;color:${muted};">This is a personal gift to a family reunion, not a charitable donation, so it is not tax-deductible. Questions? <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${textColor};">${escapeHtml(CONTACT_EMAIL)}</a> or <a href="tel:${toE164(CONTACT_PHONE)}" style="color:${textColor};">${escapeHtml(CONTACT_PHONE)}</a>.</p>`,
    ].join('\n')

    return {
        subject: `Thank you for your gift to ${data.eventTitle}`,
        text,
        html: emailLayout({
            preheader: `Your ${amount} gift to ${data.eventTitle}.`,
            heading: 'Thank you for your gift',
            bodyHtml,
        }),
    }
}
