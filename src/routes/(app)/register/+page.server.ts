import { redirect, fail } from '@sveltejs/kit'
import { defaults } from 'sveltekit-superforms'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { dbg } from '$lib/server/debug'
import { createPendingRegistration, getOpenEvent } from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo, splitFullName } from '$lib/utils'
import type { PageServerLoad, Actions } from './$types'
import { EMPTY_PERSON_DETAILS } from './EMPTY_PERSON_DETAILS'
import { registrationSchema } from './schema'
import { toMemberInputs } from './toMemberInputs'

export const load: PageServerLoad = async ({ locals }) => {
    const openEvent = await getOpenEvent()
    const tiers = openEvent ? await getTiersForEvent(openEvent.id) : []

    /* Prefill from the signed-in user where possible. Anonymous visitors — the normal case, since
       registration is public — get blanks. */
    const { firstName, lastName } = splitFullName(locals.user?.name ?? '')

    /* defaults() rather than superValidate() so a cold load renders with no errors. superValidate
       would run the schema against these blanks and ship the resulting min(1) errors to the
       client, where they flash on hydration. The action below still validates normally.

       Every field is seeded, including the nested self object and the members array, so $form is
       complete from the first render — client validation and the JSON post both read it directly. */
    const form = defaults(
        {
            eventId: openEvent?.id ?? '',
            contactFirstName: firstName,
            contactLastName: lastName,
            contactEmail: locals.user?.email ?? '',
            contactPhone: '',
            self: { ...EMPTY_PERSON_DETAILS },
            members: [],
        },
        zod(registrationSchema),
    )

    return {
        event: openEvent,
        tiers,
        form,
    }
}

export const actions: Actions = {
    register: async (event) => {
        const form = await superValidate(event.request, zod(registrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { eventId, contactEmail, contactPhone, self, members } = form.data

        /* Normalisation lives here rather than in the schema: a schema transform would rewrite
           what the user is typing during client-side validation. Lowercasing matters because
           /register/recover looks registrations up by exact contact email. */
        const contactName =
            `${form.data.contactFirstName.trim()} ${form.data.contactLastName.trim()}`.trim()
        const normalizedEmail = contactEmail.trim().toLowerCase()
        const additionalMembers = toMemberInputs(members)

        dbg.register(
            'email=%s eventId=%s members=%d',
            normalizedEmail,
            eventId,
            additionalMembers.length + 1,
        )

        const { checkoutUrl } = await createPendingRegistration({
            contactName,
            contactEmail: normalizedEmail,
            contactPhone: contactPhone || undefined,
            eventId,
            selfTierId: self.tierId,
            selfBirthDate: self.birthDate || undefined,
            selfShirtSize: self.shirtSize || undefined,
            selfAddressLine1: self.addressLine1,
            selfAddressLine2: self.addressLine2,
            selfAddressCity: self.addressCity,
            selfAddressState: self.addressState,
            selfAddressZip: self.addressZip,
            selfVegetarianMeal: parseYesNo(self.vegetarianMeal),
            selfAttendedReunion2025: parseYesNo(self.attendedReunion2025),
            additionalMembers,
            successUrl: (token) => `${event.url.origin}/register/manage?token=${token}`,
            cancelUrl: (token) => `${event.url.origin}/register?cancelled=true&token=${token}`,
        })

        throw redirect(303, checkoutUrl)
    },
}
