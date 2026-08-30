import { fail } from '@sveltejs/kit'
import { defaults } from 'sveltekit-superforms'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { createAdminRegistration, getConfirmationEmailData } from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo } from '$lib/utils'
import { EMPTY_PERSON_DETAILS } from '../../../../../register/EMPTY_PERSON_DETAILS'
import { adminRegistrationSchema } from '../../../../../register/schema'
import { toMemberInputs } from '../../../../../register/toMemberInputs'
import type { PageServerLoad, Actions } from './$types'

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

        const { eventId, contactEmail, contactPhone, status, self, members } = form.data

        /* Same normalisation as the public action, for the same reason — see the note there. */
        const contactName =
            `${form.data.contactFirstName.trim()} ${form.data.contactLastName.trim()}`.trim()
        const normalizedEmail = contactEmail.trim().toLowerCase()

        /* No assertRegistrationEditable here, unlike public registration: an admin must still be
           able to enter a paper form that arrived after the public lock date. */
        const { registrationId, managementToken } = await createAdminRegistration({
            eventId,
            contactName,
            contactEmail: normalizedEmail,
            contactPhone: contactPhone || undefined,
            status,
            members: [
                {
                    name: contactName,
                    tierId: self.tierId,
                    birthDate: self.birthDate || undefined,
                    shirtSize: self.shirtSize || undefined,
                    addressLine1: self.addressLine1,
                    addressLine2: self.addressLine2,
                    addressCity: self.addressCity,
                    addressState: self.addressState,
                    addressZip: self.addressZip,
                    vegetarianMeal: parseYesNo(self.vegetarianMeal),
                    attendedReunion2025: parseYesNo(self.attendedReunion2025),
                },
                ...toMemberInputs(members),
            ],
        })

        dbg.register(
            'admin registration created id=%s email=%s status=%s members=%d',
            registrationId,
            normalizedEmail,
            status,
            members.length + 1,
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
