import { zelleQrCodeValue } from '$lib/general/constants'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

const QR_SIZE = 128
const LOGO_WIDTH = 63
const LOGO_HEIGHT = 28

/* The Zelle QR code, for a reader paying from a computer. Image URLs are absolute on siteOrigin, like
   the header image. The QR image carries its own white margin, so a client that darkens the cell
   still leaves it scannable. */
export function zelleQrBlock(siteOrigin: string): string {
    const { cardBackground, text, fontStack } = emailThemeValue
    const origin = escapeHtml(siteOrigin)

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
  <tr>
    <td bgcolor="${cardBackground}" width="${QR_SIZE}" style="background-color:${cardBackground};padding:0 16px 0 0;vertical-align:middle;">
      <img src="${origin}${zelleQrCodeValue.qrPath}" width="${QR_SIZE}" height="${QR_SIZE}" alt="${escapeHtml(zelleQrCodeValue.alt)}" style="display:block;border:0;outline:none;text-decoration:none;">
    </td>
    <td bgcolor="${cardBackground}" style="background-color:${cardBackground};vertical-align:middle;">
      <img src="${origin}${zelleQrCodeValue.logoPath}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="Zelle" style="display:block;border:0;outline:none;text-decoration:none;">
      <p style="margin:6px 0 0 0;font-family:${fontStack};font-size:14px;line-height:1.5;color:${text};">${escapeHtml(zelleQrCodeValue.scanHint)}</p>
      <p style="margin:2px 0 0 0;font-family:${fontStack};font-size:14px;font-weight:700;line-height:1.5;color:${text};">${escapeHtml(zelleQrCodeValue.accountName)}</p>
    </td>
  </tr>
</table>`
}
