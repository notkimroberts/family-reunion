import { redirect, fail } from '@sveltejs/kit'
import { defaults } from 'sveltekit-superforms'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { dbg } from '$lib/server/debug'
import {
    createPendingRegistration,
    getOpenEvent,
    type MemberInput,
} from '$lib/server/registrations'
import type { PageServerLoad, Actions } from './$types'
import { registrationSchema } from './schema'

export const load: PageServerLoad = async ({ locals }) => {
    const openEvent = await getOpenEvent()

    /* Use defaults() (not superValidate) so the page renders with no errors on cold load.
       superValidate runs the schema against the partial defaults, which fails the min(1)
       rules on contactName/contactEmail and the members refine — those errors then ship
       to the client and flash on hydration. defaults() skips validation entirely; the
       register action below still validates submissions normally. */
    const form = defaults(
        {
            eventId: openEvent?.id ?? '',
            contactName: locals.user?.name ?? '',
            contactEmail: locals.user?.email ?? '',
            members: '[]',
        },
        zod(registrationSchema),
    )

    return {
        event: openEvent,
        form,
    }
}

export const actions: Actions = {
    register: async (event) => {
        const form = await superValidate(event.request, zod(registrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const {
            eventId,
            contactName,
            contactEmail,
            contactPhone,
            selfCategory,
            selfBirthDate,
            selfShirtSize,
            members: membersJson,
        } = form.data
        const additionalMembers: MemberInput[] = JSON.parse(membersJson)

        dbg.register(
            'email=%s eventId=%s members=%d',
            contactEmail,
            eventId,
            additionalMembers.length + 1,
        )

        const { checkoutUrl } = await createPendingRegistration({
            contactName,
            contactEmail,
            contactPhone: contactPhone || undefined,
            eventId,
            selfCategory,
            selfBirthDate: selfBirthDate || undefined,
            selfShirtSize: selfShirtSize || undefined,
            additionalMembers,
            successUrl: (token) => `${event.url.origin}/register/manage?token=${token}`,
            cancelUrl: (token) => `${event.url.origin}/register?cancelled=true&token=${token}`,
        })

        throw redirect(303, checkoutUrl)
    },
}
