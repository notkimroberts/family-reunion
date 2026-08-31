import { redirect } from '@sveltejs/kit'
import {
    getRegistrationByToken,
    getRegistrationMembers,
    getRegistrationWithEvent,
} from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

const TOKEN_COOKIE = 'reg_token'
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/* Reads the management token from either ?token= (first land from email/Stripe) or the
   reg_token cookie (subsequent visits within the same browser). When the URL carries the
   token we set the cookie and redirect to a clean URL — keeping the plaintext out of
   subsequent access logs / Sentry breadcrumbs / referers.

   Load only: this page has NO actions, and must not gain one — see manageReflectsServerState.test.ts,
   which pins that and says what it costs. */
export const load: PageServerLoad = async ({ url, cookies }) => {
    const urlToken = url.searchParams.get('token')

    if (urlToken) {
        cookies.set(TOKEN_COOKIE, urlToken, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: !url.hostname.includes('localhost'),
            maxAge: TOKEN_COOKIE_MAX_AGE,
        })
        const cleanUrl = new URL(url)
        cleanUrl.searchParams.delete('token')
        throw redirect(303, cleanUrl.toString())
    }

    const token = cookies.get(TOKEN_COOKIE)
    if (!token) {
        return { missingToken: true as const }
    }

    const registration = await getRegistrationByToken(token)
    if (!registration) {
        /* Token cookie is set but no longer matches a registration (deleted, rotated, or
           cookie carried over from another env). Clear it so a refresh doesn't loop. */
        cookies.delete(TOKEN_COOKIE, { path: '/' })
        return { missingToken: true as const }
    }

    const result = await getRegistrationWithEvent(registration.id)
    if (!result) {
        cookies.delete(TOKEN_COOKIE, { path: '/' })
        return { missingToken: true as const }
    }

    const { event: reunionEvent } = result

    const members = await getRegistrationMembers(registration.id)

    /* Narrow projection: do not ship contactName/contactEmail/managementToken hash to the
       client. The Svelte components only need id, status, and the session id. The token itself
       is not returned either — nothing posts any more, and the page is reached by the cookie. */
    return {
        missingToken: false as const,
        registration: {
            id: registration.id,
            status: registration.status,
            stripeSessionId: registration.stripeSessionId,
        },
        event: reunionEvent,
        members,
    }
}
