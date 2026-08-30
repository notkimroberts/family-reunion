import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatPrice, toE164 } from '$lib/utils'
import { emailLayout } from './_emailLayout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import { primaryButton } from './_primaryButton'
import { sectionLabel } from './_sectionLabel'
import type { ConfirmationStatus, RegistrationConfirmationData } from './types'

/* Copy keyed off registration status. One template serves both the online (always 'paid')
   and admin paper-entry paths ('paid', 'waived' for a comped place, 'pending' when money is
   still owed), so the money sentence has to change rather than the whole email.

   totalLabel describes the same number — the sum of the party's snapshotted prices — so it
   must not imply money is owed when it is not: labelling a waived party "Amount due" directly
   contradicts the note beneath it. */
const STATUS_COPY: Record<
    ConfirmationStatus,
    { heading: string; lead: string; totalLabel: string; note?: string }
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
        /* Contact details are already in the sign-off directly below, so they are not
           repeated here. */
        note: 'Please get in touch to arrange payment.',
    },
}

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
    const { insetBackground, border, text: textColor, muted, fontStack } = emailThemeValue

    /* An update keeps the status money sentence — what is owed or covered still applies — and gains
       a heading and lead saying an organiser changed something. Calling an edit "Registration
       confirmed" a second time reads as a duplicate and hides the change. */
    const heading = data.isUpdate ? 'Registration updated' : copy.heading
    const updateLead = 'An organiser updated your registration. Here is how it now stands.'
    const changes = data.isUpdate ? (data.changeSummary ?? []) : []

    const eventLines = [data.eventDateRange, data.venueName, data.venueAddress].filter(
        (line): line is string => Boolean(line),
    )

    /* ---- plain text ---- */
    const textBody = [
        `Hi ${data.name},`,
        '',
        ...(data.isUpdate ? [updateLead, ''] : []),
        ...(changes.length > 0
            ? ['What changed:', ...changes.map((line) => `  - ${line}`), '']
            : []),
        copy.lead,
        '',
        data.eventTitle,
        ...eventLines.map((line) => `  ${line}`),
        '',
        'Your party:',
        ...data.partyMembers.map((member) => {
            const detail = member.detail ? ` — ${member.detail}` : ''
            return `  - ${member.name} (${member.tierLabel})${detail}  $${formatPrice(member.priceCents)}`
        }),
        '',
        `${copy.totalLabel}: $${formatPrice(data.totalCents)}`,
        ...(copy.note ? ['', copy.note] : []),
        '',
        'Manage your registration — add members, edit details, or cancel:',
        data.manageUrl,
        '',
        `Questions? ${CONTACT_EMAIL} or ${CONTACT_PHONE}`,
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

    const partyTable = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px 0;">
${memberRows}
  <tr>
    <td style="padding:12px 0 0 0;font-family:${fontStack};font-size:15px;font-weight:700;color:${textColor};">${escapeHtml(copy.totalLabel)}</td>
    <td align="right" style="padding:12px 0 0 0;font-family:${fontStack};font-size:15px;font-weight:700;color:${textColor};white-space:nowrap;">$${formatPrice(data.totalCents)}</td>
  </tr>
</table>`

    const noteBlock = copy.note
        ? `<p style="margin:0 0 24px 0;font-family:${fontStack};font-size:14px;line-height:1.6;color:${muted};">${escapeHtml(copy.note)}</p>`
        : '<div style="height:16px;"></div>'

    const changeBlock =
        changes.length > 0
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
  <tr>
    <td bgcolor="${insetBackground}" style="background-color:${insetBackground};border:1px solid ${border};border-radius:8px;padding:16px 18px;">
      <p style="margin:0 0 8px 0;font-family:${fontStack};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${muted};">What changed</p>
      ${changes
          .map(
              (line) =>
                  `<p style="margin:0 0 4px 0;font-family:${fontStack};font-size:15px;line-height:1.5;color:${textColor};">${escapeHtml(line)}</p>`,
          )
          .join('\n      ')}
    </td>
  </tr>
</table>`
            : ''

    const bodyHtml = [
        paragraph(`Hi ${escapeHtml(data.name)},`),
        ...(data.isUpdate ? [paragraph(escapeHtml(updateLead))] : []),
        changeBlock,
        paragraph(escapeHtml(copy.lead)),
        eventBlock,
        sectionLabel('Your party'),
        partyTable,
        noteBlock,
        primaryButton(data.manageUrl, 'Manage your registration'),
        /* The bare URL is repeated because some clients strip or fail to linkify buttons,
           and the manage link is the registrant's only credential. */
        `<p style="margin:16px 0 0 0;font-family:${fontStack};font-size:12px;line-height:1.6;color:${muted};text-align:center;word-break:break-all;">Or paste this link into your browser:<br>${escapeHtml(data.manageUrl)}</p>`,
        `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${border};font-family:${fontStack};font-size:13px;line-height:1.6;color:${muted};">Questions? Reply to this email, or contact us at <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${textColor};">${escapeHtml(CONTACT_EMAIL)}</a> or <a href="tel:${toE164(CONTACT_PHONE)}" style="color:${textColor};">${escapeHtml(CONTACT_PHONE)}</a>.</p>`,
    ].join('\n')

    return {
        subject: `${heading}: ${data.eventTitle}`,
        text: textBody,
        html: emailLayout({
            preheader: `${copy.totalLabel} $${formatPrice(data.totalCents)} — ${data.partyMembers.length} ${data.partyMembers.length === 1 ? 'person' : 'people'} registered for ${data.eventTitle}.`,
            heading,
            bodyHtml,
        }),
    }
}
