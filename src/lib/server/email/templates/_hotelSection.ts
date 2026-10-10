import { HOST_HOTEL } from '$lib/general/constants'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

/* "Somewhere to stay" and "Parking" for the confirmation email, as plain-text lines and one HTML
   block. Empty when no host hotel is listed.

   Rooms are the part of a reunion that runs out, and this app cannot book them — so the
   confirmation, which is the message people keep, is where the prompt belongs. It links the GROUP
   BOOKING url where there is one: the hotel's own site quotes rack rates and knows nothing about the
   reunion's block.

   Parking quotes only the hotel's own option and links the home page for the rest: a garage list
   with prices goes stale, and the site is the one place it is kept current. siteOrigin is the origin
   of the view link, so the link follows whichever domain sent the email. */
export function hotelSection(siteOrigin: string): { textLines: string[]; html: string } {
    if (!HOST_HOTEL) {
        return { textLines: [], html: '' }
    }

    const { border, text: textColor, fontStack } = emailThemeValue
    const bookingUrl = HOST_HOTEL.bookingUrl ?? HOST_HOTEL.websiteUrl
    const ownParking = HOST_HOTEL.parking?.[0]
    const parkingUrl = `${siteOrigin}/#venue`

    const textLines = [
        '',
        `Somewhere to stay: ${HOST_HOTEL.name} — ${bookingUrl}`,
        ...(HOST_HOTEL.bookingDeadline
            ? [`Our room block rate holds until ${HOST_HOTEL.bookingDeadline}.`]
            : []),
        ...(ownParking
            ? [
                  `Parking: ${ownParking.name}, ${ownParking.price}. Nearby garages and prices: ${parkingUrl}`,
              ]
            : []),
    ]

    /* Both colours set on each paragraph, like every other block: dark-mode auto-inversion otherwise
       leaves it unreadable. */
    const paragraphStyle = `font-family:${fontStack};font-size:14px;line-height:1.6;color:${textColor};background-color:transparent;`
    const deadlineSentence = HOST_HOTEL.bookingDeadline
        ? ` Our room block rate holds until ${escapeHtml(HOST_HOTEL.bookingDeadline)}.`
        : ''
    /* "Book directly with" only where there is no block — the group link is not booking directly. */
    const bookingPhrase = HOST_HOTEL.bookingUrl ? 'Book our room block at' : 'Book directly with'
    const parkingParagraph = ownParking
        ? `<p style="margin:10px 0 0 0;${paragraphStyle}"><strong>Parking.</strong> ${escapeHtml(ownParking.name)}, ${escapeHtml(ownParking.price)}. <a href="${escapeHtml(parkingUrl)}" style="color:${textColor};">Nearby garages and prices</a>.</p>`
        : ''
    const html = `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${border};${paragraphStyle}"><strong>Somewhere to stay.</strong> ${escapeHtml(HOST_HOTEL.tagline)} ${bookingPhrase} <a href="${escapeHtml(bookingUrl)}" style="color:${textColor};">${escapeHtml(HOST_HOTEL.name)}</a>.${deadlineSentence}</p>${parkingParagraph}`

    return { textLines, html }
}
