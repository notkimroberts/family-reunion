import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

/* A boxed, amber block for something the reader has to do — the one thing in the email that must
   not be read past. Both colours on the cell so dark-mode inversion cannot wash it out. */
export function actionCallout(title: string, body: string): string {
    const { actionBackground, actionBorder, actionText, fontStack } = emailThemeValue

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
  <tr>
    <td bgcolor="${actionBackground}" style="background-color:${actionBackground};border:1px solid ${actionBorder};border-left:4px solid ${actionBorder};border-radius:8px;padding:14px 18px;">
      <p style="margin:0;font-family:${fontStack};font-size:16px;font-weight:700;line-height:1.4;color:${actionText};">${escapeHtml(title)}</p>
      <p style="margin:4px 0 0 0;font-family:${fontStack};font-size:15px;line-height:1.5;color:${actionText};">${escapeHtml(body)}</p>
    </td>
  </tr>
</table>`
}
