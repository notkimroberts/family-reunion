import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import { emailLayout } from './_emailLayout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import { primaryButton } from './_primaryButton'
import { sectionLabel } from './_sectionLabel'
import type { CancellationEmailData, RefundRoute } from './types'

/* Copy keyed off where the money went.

   Cancelling was the one action with no receipt on either side: nothing was sent, and since the
   registrant's management link dies with the registration, they were left with no record at all that
   they had cancelled or that a refund was owed. A dispute weeks later ("I never cancelled", "where is
   my money") had nothing to point at but the Stripe dashboard.

   `showsRefund` decides whether the money line appears at all. A waived or unpaid registration has
   no amount to state, and printing "$0.00 refunded" reads as a refund that failed. */
const REFUND_COPY: Record<RefundRoute, { lead: string; note?: string; showsRefund: boolean }> = {
    stripe: {
        lead: 'Your registration has been cancelled and a refund has been issued to the card you paid with.',
        note: 'Refunds usually appear on a statement within 5 to 10 business days, depending on the bank.',
        showsRefund: true,
    },
    /* Paid by cheque or cash, so no card exists to refund. Promising an automatic refund here would
       be false — the organisers have to hand the money back themselves. */
    by_hand: {
        lead: 'Your registration has been cancelled. You paid the organisers directly, so your refund will be arranged with you.',
        note: 'Nothing has been refunded through this website. Please get in touch if you have not heard from us.',
        showsRefund: true,
    },
    nothing_paid: {
        lead: 'Your registration has been cancelled. No payment had been received, so there is nothing to refund.',
        showsRefund: false,
    },
    waived: {
        lead: 'Your registration has been cancelled. Your place had been covered, so there is nothing to refund.',
        showsRefund: false,
    },
}

const HEADING = 'Registration cancelled'

/* Returns subject, plain-text body and HTML body confirming a cancelled registration.

   Both bodies are always produced and sent together: the text part is what plain-text clients,
   screen readers in text mode, and spam filters read, and html alone is a deliverability penalty. */
export function renderCancellationEmail(data: CancellationEmailData): {
    subject: string
    text: string
    html: string
} {
    const copy = REFUND_COPY[data.refundRoute]
    const { insetBackground, border, text: textColor, muted, fontStack } = emailThemeValue
    const amountLabel = data.refundRoute === 'by_hand' ? 'Amount to refund' : 'Refunded'

    /* ---- plain text ---- */
    const text = [
        `Hi ${data.name},`,
        '',
        copy.lead,
        '',
        data.eventTitle,
        '',
        'Cancelled for:',
        ...data.partyNames.map((name) => `  - ${name}`),
        ...(copy.showsRefund ? ['', `${amountLabel}: $${formatPrice(data.totalCents)}`] : []),
        ...(copy.note ? ['', copy.note] : []),
        '',
        'Changed your mind? You can register again here:',
        data.registerUrl,
        '',
        `Questions? ${CONTACT_EMAIL} or ${CONTACT_PHONE}`,
    ].join('\n')

    /* ---- html ---- */
    const paragraph = (content: string) =>
        `<p style="margin:0 0 14px 0;font-family:${fontStack};font-size:15px;line-height:1.6;color:${textColor};">${content}</p>`

    const eventBlock = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
  <tr>
    <td bgcolor="${insetBackground}" style="background-color:${insetBackground};border:1px solid ${border};border-radius:8px;padding:16px 18px;">
      <p style="margin:0;font-family:${fontStack};font-size:16px;font-weight:600;line-height:1.4;color:${textColor};">${escapeHtml(data.eventTitle)}</p>
    </td>
  </tr>
</table>`

    const nameRows = data.partyNames
        .map(
            (name) => `  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${border};font-family:${fontStack};font-size:15px;line-height:1.4;color:${textColor};">${escapeHtml(name)}</td>
  </tr>`,
        )
        .join('\n')

    const amountRow = copy.showsRefund
        ? `  <tr>
    <td style="padding:12px 0 0 0;font-family:${fontStack};font-size:15px;font-weight:700;color:${textColor};">${escapeHtml(amountLabel)}</td>
    <td align="right" style="padding:12px 0 0 0;font-family:${fontStack};font-size:15px;font-weight:700;color:${textColor};white-space:nowrap;">$${formatPrice(data.totalCents)}</td>
  </tr>`
        : ''

    const partyTable = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px 0;">
${nameRows}
${amountRow}
</table>`

    const noteBlock = copy.note
        ? `<p style="margin:0 0 24px 0;font-family:${fontStack};font-size:14px;line-height:1.6;color:${muted};">${escapeHtml(copy.note)}</p>`
        : '<div style="height:16px;"></div>'

    const bodyHtml = [
        paragraph(`Hi ${escapeHtml(data.name)},`),
        paragraph(escapeHtml(copy.lead)),
        eventBlock,
        sectionLabel('Cancelled for'),
        partyTable,
        noteBlock,
        primaryButton(data.registerUrl, 'Register again'),
        `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${border};font-family:${fontStack};font-size:13px;line-height:1.6;color:${muted};">Questions? Reply to this email, or contact us at <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${textColor};">${escapeHtml(CONTACT_EMAIL)}</a> or <a href="tel:${escapeHtml(CONTACT_PHONE)}" style="color:${textColor};">${escapeHtml(CONTACT_PHONE)}</a>.</p>`,
    ].join('\n')

    return {
        subject: `${HEADING}: ${data.eventTitle}`,
        html: emailLayout({
            preheader: copy.showsRefund
                ? `${amountLabel} $${formatPrice(data.totalCents)} — your ${data.eventTitle} registration has been cancelled.`
                : `Your ${data.eventTitle} registration has been cancelled.`,
            heading: HEADING,
            bodyHtml,
        }),
        text,
    }
}
