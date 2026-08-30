import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { toE164 } from '$lib/utils'
import { emailLayout } from './_emailLayout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import { primaryButton } from './_primaryButton'

/* Returns subject, plain-text body and HTML body for re-sending the management link to a
   registrant who lost the original email. Requesting a new link invalidates the old one, so
   the copy says so — otherwise a registrant with two emails open picks the dead link. */
export function renderRecoveryEmail(data: { eventTitle: string; manageUrl: string }): {
    subject: string
    text: string
    html: string
} {
    const { border, text: textColor, muted, fontStack } = emailThemeValue

    const text = [
        'Hi,',
        '',
        `Here is your link to manage your registration for ${data.eventTitle}:`,
        '',
        data.manageUrl,
        '',
        'Use it to view your party, add or edit members, or cancel your registration.',
        '',
        'This replaces any earlier management link for this registration — older links no longer work.',
        '',
        `Questions? ${CONTACT_EMAIL} or ${CONTACT_PHONE}`,
    ].join('\n')

    const paragraph = (content: string) =>
        `<p style="margin:0 0 14px 0;font-family:${fontStack};font-size:15px;line-height:1.6;color:${textColor};">${content}</p>`

    const bodyHtml = [
        paragraph(
            `Here is your link to manage your registration for <strong>${escapeHtml(data.eventTitle)}</strong>.`,
        ),
        paragraph('Use it to view your party, add or edit members, or cancel your registration.'),
        '<div style="height:8px;"></div>',
        primaryButton(data.manageUrl, 'Manage your registration'),
        `<p style="margin:16px 0 0 0;font-family:${fontStack};font-size:12px;line-height:1.6;color:${muted};text-align:center;word-break:break-all;">Or paste this link into your browser:<br>${escapeHtml(data.manageUrl)}</p>`,
        `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${border};font-family:${fontStack};font-size:13px;line-height:1.6;color:${muted};">This replaces any earlier management link for this registration — older links no longer work. Questions? <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${textColor};">${escapeHtml(CONTACT_EMAIL)}</a> or <a href="tel:${toE164(CONTACT_PHONE)}" style="color:${textColor};">${escapeHtml(CONTACT_PHONE)}</a>.</p>`,
    ].join('\n')

    return {
        subject: `Manage your ${data.eventTitle} registration`,
        text,
        html: emailLayout({
            preheader: `Your management link for ${data.eventTitle}.`,
            heading: 'Your registration link',
            bodyHtml,
        }),
    }
}
