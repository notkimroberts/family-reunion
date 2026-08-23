import { fail } from '@sveltejs/kit'
import { defaults } from 'sveltekit-superforms'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import {
    createAdminRegistration,
    getConfirmationEmailData,
    getOpenEvent,
} from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo } from '$lib/utils'
import { parseFormMembers } from '../../register/parseFormMembers'
import { adminRegistrationSchema } from '../../register/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const openEvent = await getOpenEvent()
    const tiers = openEvent ? await getTiersForEvent(openEvent.id) : []

    /* defaults() rather than superValidate() so a cold load renders with no errors — the
       partial defaults would otherwise fail the min(1) rules and flash on hydration. */
    const form = defaults(
        {
            eventId: openEvent?.id ?? '',
            contactName: '',
            contactEmail: '',
            members: '[]',
            status: 'paid' as const,
        },
        zod(adminRegistrationSchema),
    )

    return {
        events: openEvent ? [openEvent] : [],
        tiers,
        form,
    }
}

export const actions: Actions = {
    default: async (event) => {
        requireAdmin(event)

        const form = await superValidate(event.request, zod(adminRegistrationSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const {
            eventId,
            contactName,
            contactEmail,
            contactPhone,
            status,
            selfTierId,
            selfBirthDate,
            selfShirtSize,
            selfAddressLine1,
            selfAddressLine2,
            selfAddressCity,
            selfAddressState,
            selfAddressZip,
            selfVegetarianMeal,
            selfAttendedReunion2025,
            members: membersJson,
        } = form.data

        let additionalMembers
        try {
            additionalMembers = parseFormMembers(membersJson)
        } catch {
            return fail(400, { form, error: 'Invalid member data' })
        }

        /* No assertRegistrationEditable here, unlike public registration: an admin must still
           be able to enter a paper form that arrived after the public lock date. */
        const { registrationId, managementToken } = await createAdminRegistration({
            eventId,
            contactName,
            contactEmail,
            contactPhone: contactPhone || undefined,
            status,
            members: [
                {
                    name: contactName,
                    tierId: selfTierId,
                    birthDate: selfBirthDate || undefined,
                    shirtSize: selfShirtSize || undefined,
                    addressLine1: selfAddressLine1,
                    addressLine2: selfAddressLine2,
                    addressCity: selfAddressCity,
                    addressState: selfAddressState,
                    addressZip: selfAddressZip,
                    vegetarianMeal: parseYesNo(selfVegetarianMeal),
                    attendedReunion2025: parseYesNo(selfAttendedReunion2025),
                },
                ...additionalMembers,
            ],
        })

        dbg.register(
            'admin registration created id=%s email=%s status=%s members=%d',
            registrationId,
            contactEmail,
            status,
            additionalMembers.length + 1,
        )

        /* The plaintext token exists only here — the DB stores its hash — so this is the one
           chance to get it to the registrant. It is returned to the page as well as emailed,
           so a wrong email address does not strand them: the admin can read the link out.

           A failed send must NOT roll back the registration. The row is correct and the admin
           has the link on screen; losing the entry would be the worse outcome. */
        const manageUrl = `${event.url.origin}/register/manage?token=${managementToken}`
        let emailSent = false
        let emailError: string | undefined

        try {
            const confirmation = await getConfirmationEmailData({ registrationId, manageUrl })
            if (confirmation) {
                await sendRegistrationConfirmation(
                    confirmation.to,
                    confirmation.data,
                    `confirm/${registrationId}`,
                )
                emailSent = true
            } else {
                emailError = 'Could not assemble the confirmation email.'
            }
        } catch (err) {
            dbg.register('admin confirmation email failed for %s: %o', registrationId, err)
            emailError = err instanceof Error ? err.message : 'Unknown email error'
        }

        return { form, success: true, registrationId, manageUrl, emailSent, emailError }
    },
}
