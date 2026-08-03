import { redirect, fail } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import {
    addMember,
    cancelRegistration,
    getRegistrationByToken,
    getRegistrationMembers,
    getRegistrationWithEvent,
    removeMember,
    updateMemberDetails,
} from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo } from '$lib/utils'
import {
    addMemberSchema,
    cancelRegistrationSchema,
    removeMemberSchema,
    updateMemberSchema,
} from '../schema'
import type { PageServerLoad, Actions } from './$types'

const TOKEN_COOKIE = 'reg_token'
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/* Reads the management token from either ?token= (first land from email/Stripe) or the
   reg_token cookie (subsequent visits within the same browser). When the URL carries the
   token we set the cookie and redirect to a clean URL — keeping the plaintext out of
   subsequent access logs / Sentry breadcrumbs / referers. */
export const load: PageServerLoad = async ({ url, cookies }) => {
    const urlToken = url.searchParams.get('token')
    const memberAdded = url.searchParams.get('member_added') === 'true'

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

    const [members, tiers] = await Promise.all([
        getRegistrationMembers(registration.id),
        getTiersForEvent(reunionEvent.id),
    ])

    /* Narrow projection: do not ship contactName/contactEmail/managementToken hash to the
       client. The Svelte components only need id, status, and the session id. */
    return {
        missingToken: false as const,
        token,
        memberAdded,
        registration: {
            id: registration.id,
            status: registration.status,
            stripeSessionId: registration.stripeSessionId,
        },
        event: reunionEvent,
        members,
        tiers,
    }
}

export const actions: Actions = {
    add_member: async (event) => {
        const form = await superValidate(event.request, zod(addMemberSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const {
            token,
            registrationId,
            name,
            tierId,
            birthDate,
            shirtSize,
            addressLine1,
            addressLine2,
            addressCity,
            addressState,
            addressZip,
            vegetarianMeal,
            attendedReunion2025,
        } = form.data

        const checkoutUrl = await addMember({
            registrationId,
            managementToken: token,
            name,
            tierId,
            birthDate: birthDate || undefined,
            shirtSize: shirtSize || undefined,
            addressLine1,
            addressLine2,
            addressCity,
            addressState,
            addressZip,
            vegetarianMeal: parseYesNo(vegetarianMeal),
            attendedReunion2025: parseYesNo(attendedReunion2025),
            successUrl: `${event.url.origin}/register/manage?member_added=true`,
            cancelUrl: `${event.url.origin}/register/manage`,
        })

        throw redirect(303, checkoutUrl)
    },

    update_member: async (event) => {
        const form = await superValidate(event.request, zod(updateMemberSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const { token, memberId, birthDate, shirtSize, vegetarianMeal } = form.data

        /* Pass through the raw form values: undefined means the field wasn't in the form
           (preserve), '' means explicit clear. updateMemberDetails handles the distinction. */
        await updateMemberDetails(memberId, { birthDate, shirtSize, vegetarianMeal }, token)

        return { success: true }
    },

    remove_member: async (event) => {
        const form = await superValidate(event.request, zod(removeMemberSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        await removeMember(form.data.memberId, form.data.token)
        return { success: true }
    },

    cancel: async (event) => {
        const form = await superValidate(event.request, zod(cancelRegistrationSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        await cancelRegistration(form.data.registrationId, form.data.token)
        throw redirect(303, `/register/manage`)
    },
}
