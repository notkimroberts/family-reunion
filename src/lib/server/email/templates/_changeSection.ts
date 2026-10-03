import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import type { RegistrationChange } from './types'

/* The "What changed" block of an update email, as plain-text lines and one HTML block. Empty when
   nothing is listed.

   An edited value shows before → after. "Bo's details were updated" told the registrant something
   moved but not what, so a wrong correction — a birthday typed into the wrong year — went unnoticed
   until the shirts arrived. */
export function changeSection(changes: RegistrationChange[]): {
    textLines: string[]
    html: string
} {
    if (changes.length === 0) {
        return { textLines: [], html: '' }
    }

    const { insetBackground, border, text: textColor, muted, fontStack } = emailThemeValue

    const textLines = [
        'What changed:',
        ...changes.map((change) =>
            change.before !== undefined && change.after !== undefined
                ? `  - ${change.summary}: ${change.before} → ${change.after}`
                : `  - ${change.summary}`,
        ),
        '',
    ]

    const rows = changes
        .map((change) => {
            const summary = `<p style="margin:0 0 2px 0;font-family:${fontStack};font-size:15px;line-height:1.5;color:${textColor};">${escapeHtml(change.summary)}</p>`
            /* Struck through and muted, then bold: the eye lands on the current value. */
            const values =
                change.before !== undefined && change.after !== undefined
                    ? `<p style="margin:0 0 10px 0;font-family:${fontStack};font-size:14px;line-height:1.5;color:${muted};"><span style="text-decoration:line-through;">${escapeHtml(change.before)}</span> &rarr; <strong style="color:${textColor};">${escapeHtml(change.after)}</strong></p>`
                    : '<div style="height:8px;"></div>'
            return `${summary}\n      ${values}`
        })
        .join('\n      ')

    const html = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
  <tr>
    <td bgcolor="${insetBackground}" style="background-color:${insetBackground};border:1px solid ${border};border-radius:8px;padding:16px 18px 8px 18px;">
      <p style="margin:0 0 10px 0;font-family:${fontStack};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${muted};">What changed</p>
      ${rows}
    </td>
  </tr>
</table>`

    return { textLines, html }
}
