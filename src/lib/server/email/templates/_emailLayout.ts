import { REUNION_NAME } from '$lib/general/constants'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

/* Will and Roxie, the couple the reunion descends from — the same portrait as the site's favicon and
   share card, cropped to the photograph with no transparent bands (Outlook paints transparency
   black) and served from static/. Displayed at 120px from a 346px source, so it stays sharp on a
   retina screen. */
const HEADER_IMAGE_PATH = '/will_and_roxie_email.jpg'
const HEADER_IMAGE_WIDTH = 120
const HEADER_IMAGE_HEIGHT = 87

/* Shared HTML chrome for every transactional email.

   Email client constraints this deliberately works around:
   - Table layout with role="presentation". Flexbox and grid are unsupported in Outlook's
     Word rendering engine.
   - Every style is inline. Gmail strips <head><style> on forwarded mail and in some webmail
     views, so nothing structural may depend on it.
   - Explicit background-color AND color on each cell. Clients that auto-invert for dark mode
     (Gmail iOS, Outlook.com) recolour only what is left unspecified, so stating both keeps
     text legible either way; color-scheme additionally asks them not to invert.
   - A hidden preheader sets the inbox preview line, which otherwise samples the first visible
     text — here the wordmark, which tells the reader nothing.
   - The header image is an absolute URL on siteOrigin, the origin the email's own links use, so it
     loads from whichever domain sent it. Clients that block images show the alt text, and the
     reunion's name sits under it as text, so nothing is lost without it. */
export function emailLayout(params: {
    preheader: string
    heading: string
    bodyHtml: string
    siteOrigin: string
}): string {
    const { pageBackground, cardBackground, border, text, muted, accent, fontStack } =
        emailThemeValue

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(params.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${pageBackground};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${pageBackground};">${escapeHtml(params.preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${pageBackground}" style="background-color:${pageBackground};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
        <tr>
          <td align="center" style="padding:0 0 20px 0;font-family:${fontStack};font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${muted};">
            <img src="${escapeHtml(params.siteOrigin)}${HEADER_IMAGE_PATH}" width="${HEADER_IMAGE_WIDTH}" height="${HEADER_IMAGE_HEIGHT}" alt="Will and Roxie Patterson" style="display:block;margin:0 auto 12px auto;border:0;border-radius:8px;outline:none;text-decoration:none;">
            ${escapeHtml(REUNION_NAME)}
          </td>
        </tr>
        <tr>
          <td bgcolor="${cardBackground}" style="background-color:${cardBackground};border:1px solid ${border};border-radius:12px;padding:32px 28px;">
            <h1 style="margin:0;font-family:${fontStack};font-size:22px;line-height:1.3;font-weight:700;color:${text};">${escapeHtml(params.heading)}</h1>
            <div style="width:40px;height:2px;background-color:${accent};margin:14px 0 22px 0;"></div>
            ${params.bodyHtml}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 8px 0 8px;font-family:${fontStack};font-size:12px;line-height:1.6;color:${muted};">
            You are receiving this email about the ${escapeHtml(REUNION_NAME)}.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
