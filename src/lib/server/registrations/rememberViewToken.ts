import { redirect, type Cookies } from '@sveltejs/kit'
import { VIEW_TOKEN_COOKIE } from './VIEW_TOKEN_COOKIE'

const VIEW_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/* Moves a view token from ?token= into the reg_token cookie and redirects to the same URL without it,
   so from then on the plaintext stays out of access logs, Sentry breadcrumbs and referers. Does
   nothing when the URL carries no token.

   Shared by /register/view and /register/pay, the two pages an email links to. A GET here only sets
   a cookie, so a mail scanner following the link changes nothing. */
export function rememberViewToken(url: URL, cookies: Cookies): void {
    const urlToken = url.searchParams.get('token')
    if (!urlToken) {
        return
    }

    cookies.set(VIEW_TOKEN_COOKIE, urlToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: !url.hostname.includes('localhost'),
        maxAge: VIEW_TOKEN_COOKIE_MAX_AGE,
    })
    const cleanUrl = new URL(url)
    cleanUrl.searchParams.delete('token')
    throw redirect(303, cleanUrl.toString())
}
