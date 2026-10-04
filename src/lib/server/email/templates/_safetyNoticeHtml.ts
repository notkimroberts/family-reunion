import { ZELLE_RECIPIENT } from '$lib/general/constants'
import { paymentMethods, paymentSafetyCopyValue } from '$lib/general/scamSafety'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

const copy = paymentSafetyCopyValue

/* Green for what we take, red for what we never ask — the site card's two panels, stacked, since a
   two-column table collapses badly on a phone. Paragraphs with a ✓ / ✕ rather than <ul>: Outlook's
   list indents ignore inline styles. Every cell states both colors so dark-mode inversion cannot
   wash the panels out. */
const acceptedPanelValue = {
    background: '#f0fdf4',
    border: '#bbf7d0',
    title: '#166534',
    mark: '#15803d',
}
const neverPanelValue = {
    background: '#fef2f2',
    border: '#fecaca',
    title: '#991b1b',
    mark: '#dc2626',
}

function panel(
    colors: typeof acceptedPanelValue,
    title: string,
    mark: string,
    lines: readonly { strong?: string; rest: string }[],
): string {
    const { text, fontStack } = emailThemeValue
    const rows = lines
        .map(
            ({ strong, rest }) =>
                `<p style="margin:6px 0 0 0;font-family:${fontStack};font-size:15px;line-height:1.45;color:${text};"><span style="color:${colors.mark};font-weight:700;">${mark}</span>&nbsp; ${strong ? `<strong>${escapeHtml(strong)}</strong> ` : ''}${escapeHtml(rest)}</p>`,
        )
        .join('\n')
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:12px 0 0 0;">
  <tr>
    <td bgcolor="${colors.background}" style="background-color:${colors.background};border:1px solid ${colors.border};border-radius:8px;padding:12px 16px;color:${text};">
      <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${colors.title};">${escapeHtml(title)}</p>
${rows}
    </td>
  </tr>
</table>`
}

/* The scam warning under every HTML email's card. */
export function safetyNoticeHtml(): string {
    const { cardBackground, border, text, muted, fontStack } = emailThemeValue
    const accepted = panel(
        acceptedPanelValue,
        copy.acceptedHeading,
        '&#10003;',
        paymentMethods(ZELLE_RECIPIENT).map(({ label, detail }) => ({
            strong: label,
            rest: detail,
        })),
    )
    const never = panel(
        neverPanelValue,
        copy.neverHeading,
        '&#10005;',
        copy.neverAskedFor.map((item) => ({ rest: item })),
    )

    return `<td bgcolor="${cardBackground}" style="background-color:${cardBackground};border:1px solid ${border};border-radius:12px;padding:20px 22px;color:${text};">
      <p style="margin:0;font-family:${fontStack};font-size:17px;line-height:1.3;font-weight:700;color:${text};">${escapeHtml(copy.heading)}</p>
      <p style="margin:4px 0 0 0;font-family:${fontStack};font-size:14px;line-height:1.5;color:${muted};">${escapeHtml(copy.lede)}</p>
${accepted}
${never}
      <p style="margin:14px 0 0 0;font-family:${fontStack};font-size:14px;line-height:1.5;color:${text};">${escapeHtml(copy.verifyLine)}</p>
      <p style="margin:6px 0 0 0;font-family:${fontStack};font-size:13px;line-height:1.5;color:${muted};">${escapeHtml(copy.statementLine)}</p>
    </td>`
}
