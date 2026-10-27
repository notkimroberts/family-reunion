import {
    VIEW_TOKEN_COOKIE,
    getRegistrationByToken,
    getRegistrationMembers,
    getRegistrationWithEvent,
    rememberViewToken,
} from '$lib/server/registrations'
import type { EventDetails, RegistrationViewMember } from '../types'
import type { PageServerLoad } from './$types'

/* Reads the view token from either ?token= (first land from email/Stripe) or the
   reg_token cookie (subsequent visits within the same browser). When the URL carries the
   token we set the cookie and redirect to a clean URL — keeping the plaintext out of
   subsequent access logs / Sentry breadcrumbs / referers.

   Load only: this page has NO actions, and must not gain one — see viewReflectsServerState.test.ts,
   which pins that and says what it costs. */
export const load: PageServerLoad = async ({ url, cookies }) => {
    rememberViewToken(url, cookies)

    const token = cookies.get(VIEW_TOKEN_COOKIE)
    if (!token) {
        return { missingToken: true as const }
    }

    const registration = await getRegistrationByToken(token)
    if (!registration) {
        /* Token cookie is set but no longer matches a registration (deleted, rotated, or
           cookie carried over from another env). Clear it so a refresh doesn't loop. */
        cookies.delete(VIEW_TOKEN_COOKIE, { path: '/' })
        return { missingToken: true as const }
    }

    const result = await getRegistrationWithEvent(registration.id)
    if (!result) {
        cookies.delete(VIEW_TOKEN_COOKIE, { path: '/' })
        return { missingToken: true as const }
    }

    const { event: reunionEvent } = result

    const members = await getRegistrationMembers(registration.id)

    /* Narrow projection: do not ship contactName/contactEmail/viewToken hash to the
       client. The Svelte components only need id, status, and the session id. The token itself
       is not returned either — nothing posts any more, and the page is reached by the cookie.

       Members and event are narrowed the same way. Page data is readable in the page source whether
       or not it renders, and a forwarded link would otherwise hand over every attendee's home
       address and Stripe ids, plus the admin-only program metadata. */
    return {
        missingToken: false as const,
        registration: {
            id: registration.id,
            status: registration.status,
            stripeSessionId: registration.stripeSessionId,
        },
        event: {
            id: reunionEvent.id,
            title: reunionEvent.title,
            registrationLockDate: reunionEvent.registrationLockDate,
        } satisfies EventDetails,
        members: members.map((member): RegistrationViewMember => ({
            id: member.id,
            name: member.name,
            birthYear: member.birthYear,
            birthMonth: member.birthMonth,
            birthDay: member.birthDay,
            shirtSize: member.shirtSize,
            vegetarianMeal: member.vegetarianMeal,
            tierLabel: member.tierLabel,
            priceCents: member.priceCents,
            paymentDue: member.paymentDue,
            cardFeeCents: member.cardFeeCents,
        })),
    }
}
