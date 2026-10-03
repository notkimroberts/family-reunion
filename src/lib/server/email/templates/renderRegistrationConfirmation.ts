import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatPrice, toE164 } from '$lib/utils'
import { actionCallout } from './_actionCallout'
import { changeSection } from './_changeSection'
import { emailLayout } from './_emailLayout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import { hotelSection } from './_hotelSection'
import { primaryButton } from './_primaryButton'
import { sectionLabel } from './_sectionLabel'
import type { ConfirmationStatus, RegistrationConfirmationData } from './types'

/* Copy keyed off registration status. One template serves both the online (always 'paid')
   and admin paper-entry paths ('paid', 'waived' for a comped place, 'pending' when money is
   still owed), so the money sentence has to change rather than the whole email.

   totalLabel describes the same number — the sum of the party's snapshotted prices — so it
   must not imply money is owed when it is not: labelling a waived party "Amount due" directly
   contradicts the note beneath it.

   action is something the reader must do, shown as a callout under the lead rather than a muted
   note under the table — where "reply to arrange payment" was easy to read past. */
const STATUS_COPY: Record<
    ConfirmationStatus,
    { heading: string; lead: string; totalLabel: string; note?: string; action?: string }
> = {
    paid: {
        heading: 'Registration confirmed',
        lead: 'Your registration is confirmed and your payment has gone through.',
        totalLabel: 'Total paid',
    },
    waived: {
        heading: 'Registration confirmed',
        lead: 'Your registration is confirmed. No payment is needed for your party.',
        totalLabel: 'Total (covered)',
        note: 'Your place has been covered — there is nothing to pay.',
    },
    pending: {
        heading: 'Registration received',
        lead: 'Your registration is recorded. It is not complete until payment is received.',
        totalLabel: 'Amount due',
        /* Contact details are already in the sign-off, so they are not repeated here. */
        action: 'Reply to this email to arrange payment.',
    },
}

/* 'paid' covers cash and cheques recorded by an organiser as well as cards, and "your payment has
   gone through" reads as a card charge to someone who handed over a cheque. */
const PAID_BY_HAND_LEAD = 'Your registration is confirmed and we have received your payment.'

/* Online prices are snapshotted with the card fee folded in, while the register page lists the fee
   on its own line — without this the per-person prices look like a different, higher tier. */
const CARD_FEE_NOTE = 'Prices include the card processing fee.'

/* Registrants cannot edit their own booking any more (see /register/manage), so the email they keep
   has to say who can. */
const CHANGE_NOTE =
    'Need to add someone or change a detail? Reply to this email and an organizer will update it for you.'

/* Returns subject, plain-text body and HTML body confirming an event registration.

   Both bodies are always produced and sent together: the text part is what plain-text
   clients, screen readers in text mode, and spam filters read, and sending html alone is a
   deliverability penalty. */
export function renderRegistrationConfirmation(data: RegistrationConfirmationData): {
    subject: string
    text: string
    html: string
} {
    const copy = STATUS_COPY[data.status]
    const isPaid = data.status === 'paid'
    const lead = isPaid && !data.paidByCard ? PAID_BY_HAND_LEAD : copy.lead
    const note = isPaid && data.paidByCard ? CARD_FEE_NOTE : copy.note
    const siteOrigin = new URL(data.manageUrl).origin
    const hotel = hotelSection(siteOrigin)
    const { insetBackground, border, text: textColor, muted, fontStack } = emailThemeValue
    const total = `$${formatPrice(data.totalCents)}`

    /* An update keeps the status money sentence — what is owed or covered still applies — and gains
       a heading and lead saying an organiser changed something. Calling an edit "Registration
       confirmed" a second time reads as a duplicate and hides the change. */
    const heading = data.isUpdate ? 'Registration updated' : copy.heading
    const updateLead = 'An organizer updated your registration. Here is how it now stands.'
    const changes = changeSection(data.isUpdate ? (data.changeSummary ?? []) : [])

    const eventLines = [data.eventDateRange, data.venueName, data.venueAddress].filter(
        (line): line is string => Boolean(line),
    )

    /* ---- plain text ---- */
    const textBody = [
        `Hi ${data.name},`,
        '',
        ...(data.isUpdate ? [updateLead, ''] : []),
        ...changes.textLines,
        lead,
        '',
        /* Capitals are the only emphasis plain text has. */
        ...(copy.action ? [`PAYMENT NEEDED: ${total}. ${copy.action}`, ''] : []),
        data.eventTitle,
        ...eventLines.map((line) => `  ${line}`),
        '',
        'Your party:',
        ...data.partyMembers.map((member) => {
            const detail = member.detail ? ` — ${member.detail}` : ''
            return `  - ${member.name} (${member.tierLabel})${detail}  $${formatPrice(member.priceCents)}`
        }),
        ...(data.donationCents
            ? [`  - Gift to the reunion  $${formatPrice(data.donationCents)}`]
            : []),
        '',
        `${copy.totalLabel}: ${total}`,
        ...(note ? ['', note] : []),
        '',
        'View your registration at any time:',
        data.manageUrl,
        '',
        CHANGE_NOTE,
        ...hotel.textLines,
        '',
        `Questions? Reply to this email, or contact us at ${CONTACT_EMAIL} or ${CONTACT_PHONE}.`,
        '',
        'See you at the reunion!',
    ].join('\n')

    /* ---- html ---- */
    const paragraph = (content: string) =>
        `<p style="margin:0 0 14px 0;font-family:${fontStack};font-size:15px;line-height:1.6;color:${textColor};">${content}</p>`

    const eventBlock = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
  <tr>
    <td bgcolor="${insetBackground}" style="background-color:${insetBackground};border:1px solid ${border};border-radius:8px;padding:16px 18px;">
      <p style="margin:0;font-family:${fontStack};font-size:16px;font-weight:600;line-height:1.4;color:${textColor};">${escapeHtml(data.eventTitle)}</p>
      ${eventLines
          .map(
              (line) =>
                  `<p style="margin:4px 0 0 0;font-family:${fontStack};font-size:14px;line-height:1.5;color:${muted};">${escapeHtml(line)}</p>`,
          )
          .join('\n      ')}
    </td>
  </tr>
</table>`

    const memberRows = data.partyMembers
        .map(
            (member) => `  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${border};font-family:${fontStack};font-size:15px;line-height:1.4;color:${textColor};">
      ${escapeHtml(member.name)}
      <span style="display:block;font-size:13px;color:${muted};">${escapeHtml(member.tierLabel)}${member.detail ? ` &middot; ${escapeHtml(member.detail)}` : ''}</span>
    </td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid ${border};font-family:${fontStack};font-size:15px;line-height:1.4;color:${textColor};white-space:nowrap;">$${formatPrice(member.priceCents)}</td>
  </tr>`,
        )
        .join('\n')

    /* A gift is a row in the same table rather than a line after the total, because totalCents
       INCLUDES it — the total has to be what the card was charged, and a figure that exceeds the
       rows above it reads as an overcharge. */
    const donationRow = data.donationCents
        ? `  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${border};font-family:${fontStack};font-size:15px;line-height:1.4;color:${textColor};">
      Gift to the reunion
      <span style="display:block;font-size:13px;color:${muted};">Thank you</span>
    </td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid ${border};font-family:${fontStack};font-size:15px;line-height:1.4;color:${textColor};white-space:nowrap;">$${formatPrice(data.donationCents)}</td>
  </tr>`
        : ''

    const partyTable = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px 0;">
${memberRows}
${donationRow}
  <tr>
    <td style="padding:12px 0 0 0;font-family:${fontStack};font-size:15px;font-weight:700;color:${textColor};">${escapeHtml(copy.totalLabel)}</td>
    <td align="right" style="padding:12px 0 0 0;font-family:${fontStack};font-size:15px;font-weight:700;color:${textColor};white-space:nowrap;">${total}</td>
  </tr>
</table>`

    const noteBlock = note
        ? `<p style="margin:0 0 24px 0;font-family:${fontStack};font-size:14px;line-height:1.6;color:${muted};">${escapeHtml(note)}</p>`
        : '<div style="height:16px;"></div>'

    const actionBlock = copy.action ? actionCallout(`Payment needed: ${total}`, copy.action) : ''

    const bodyHtml = [
        paragraph(`Hi ${escapeHtml(data.name)},`),
        ...(data.isUpdate ? [paragraph(escapeHtml(updateLead))] : []),
        changes.html,
        paragraph(escapeHtml(lead)),
        actionBlock,
        eventBlock,
        sectionLabel('Your party'),
        partyTable,
        noteBlock,
        primaryButton(data.manageUrl, 'View your registration'),
        /* The bare URL is repeated because some clients strip or fail to linkify buttons,
           and the manage link is the registrant's only credential. */
        `<p style="margin:16px 0 0 0;font-family:${fontStack};font-size:12px;line-height:1.6;color:${muted};text-align:center;word-break:break-all;">Or paste this link into your browser:<br>${escapeHtml(data.manageUrl)}</p>`,
        `<p style="margin:22px 0 0 0;font-family:${fontStack};font-size:14px;line-height:1.6;color:${textColor};">${escapeHtml(CHANGE_NOTE)}</p>`,
        hotel.html,
        `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${border};font-family:${fontStack};font-size:13px;line-height:1.6;color:${muted};">Questions? Reply to this email, or contact us at <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${textColor};">${escapeHtml(CONTACT_EMAIL)}</a> or <a href="tel:${toE164(CONTACT_PHONE)}" style="color:${textColor};">${escapeHtml(CONTACT_PHONE)}</a>.</p>`,
        `<p style="margin:18px 0 0 0;font-family:${fontStack};font-size:15px;line-height:1.6;color:${textColor};">See you at the reunion!</p>`,
    ].join('\n')

    return {
        subject: `${heading}: ${data.eventTitle}`,
        text: textBody,
        html: emailLayout({
            preheader: copy.action
                ? `Payment needed: ${total} — ${copy.action}`
                : `${copy.totalLabel} ${total} — ${data.partyMembers.length} ${data.partyMembers.length === 1 ? 'person' : 'people'} registered for ${data.eventTitle}.`,
            heading,
            bodyHtml,
            siteOrigin,
        }),
    }
}
