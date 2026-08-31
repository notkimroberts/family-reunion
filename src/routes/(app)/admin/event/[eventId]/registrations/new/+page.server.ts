import { fail } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { defaults, superValidate } from 'sveltekit-superforms/server'
import { HOST_HOTEL } from '$lib/general/constants'
import { requireAdmin } from '$lib/server/auth/guards'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { createAdminRegistration, getConfirmationEmailData } from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import { getTiersForEvent } from '$lib/server/tiers'
import { EMPTY_PERSON_DETAILS } from '../../../../../register/EMPTY_PERSON_DETAILS'
import { adminRegistrationSchema } from '../../../../../register/schema'
import { toRegistrationIntake } from '../../../../../register/toRegistrationIntake'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* The event in the URL, not the open one. This was a live bug: tiers came from getOpenEvent()
       while the form's eventId came from the year filter, so arriving from a non-open year posted one
       event's id with another's tier ids and resolveTierPricing fail-closed with "Invalid tier
       selected". Keeping getOpenEvent() here after the move would be worse than the bug it replaced —
       the page would silently file the registration against the wrong event with no error at all. */
    const tiers = await getTiersForEvent(event.params.eventId)

    /* defaults() rather than superValidate() so a cold load renders with no errors; the action
       below still validates. Every field is seeded so $form is complete from the first render. */
    const form = defaults(
        {
            eventId: event.params.eventId,
            contactFirstName: '',
            contactLastName: '',
            contactEmail: '',
            contactPhone: '',
            self: { ...EMPTY_PERSON_DETAILS },
            members: [],
            stayingAtHostHotel: HOST_HOTEL ? ('' as const) : ('undecided' as const),
            donationCents: 0,
            status: 'paid' as const,
        },
        zod(adminRegistrationSchema),
    )

    /* No `events` key. It used to return `[openEvent]` and SHADOWED the admin layout's `events`
       (PageData = Omit<PageParentData, keyof PageServerData> & PageServerData), so `data.events` meant
       "every event" on one admin page and "the open event only" on this one. */
    return { tiers, form }
}

export const actions: Actions = {
    default: async (event) => {
        requireAdmin(event)

        const form = await superValidate(event.request, zod(adminRegistrationSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const intake = toRegistrationIntake(form.data)

        /* No assertRegistrationEditable here, unlike public registration: an admin must still be
           able to enter a paper form that arrived after the public lock date. */
        const { registrationId, managementToken } = await createAdminRegistration({
            ...intake,
            eventId: form.data.eventId,
            donationCents: form.data.donationCents,
            status: form.data.status,
        })

        dbg.register(
            'admin registration created id=%s email=%s status=%s members=%d',
            registrationId,
            intake.contactEmail,
            form.data.status,
            intake.members.length,
        )

        /* The plaintext token exists only here — the DB stores its hash — so this is the one
           chance to get it to the registrant. It is returned to the page as well as emailed, so a
           wrong email address does not strand them: the admin can read the link out.

           A failed send must NOT roll back the registration. The row is correct and the admin has
           the link on screen; losing the entry would be the worse outcome. */
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
            reportError('admin confirmation email failed', err, { registrationId })
            emailError = err instanceof Error ? err.message : 'Unknown email error'
        }

        return { form, success: true, registrationId, manageUrl, emailSent, emailError }
    },
}
