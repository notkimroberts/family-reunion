import { APP_DOMAIN } from '$lib/general/constants'

/* Hostnames that only resolve on the machine that sent the email. */
const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']

/* The origin email images load from.

   Normally the origin of the email's own links, so the images follow whichever domain sent it. A dev
   server's origin is loopback, and a mail service fetches images from its own servers — Gmail
   through Google's image proxy — which cannot reach the sender's machine, so every image in an email
   sent from `bun run dev` came out broken. Those fall back to the live site, which serves the same
   files from static/. Links are not affected: they stay on the dev server, where a click from the
   same machine does reach it. */
export function emailAssetOrigin(siteOrigin: string): string {
    return LOOPBACK_HOSTNAMES.includes(new URL(siteOrigin).hostname)
        ? `https://${APP_DOMAIN}`
        : siteOrigin
}
