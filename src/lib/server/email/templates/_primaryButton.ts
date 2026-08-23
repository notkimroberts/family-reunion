import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

/* Primary call-to-action. The background lives on a table cell rather than the <a> so
   Outlook's Word renderer fills the whole block instead of just the text run. */
export function primaryButton(href: string, label: string): string {
    const { accent, fontStack } = emailThemeValue
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="${accent}" style="border-radius:6px;background-color:${accent};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-family:${fontStack};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}
