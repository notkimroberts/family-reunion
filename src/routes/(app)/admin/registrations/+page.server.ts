import { fail } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth/guards'
import { createAdminRegistration, getOpenEvent } from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import { isValidPhone, parseYesNo } from '$lib/utils'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const openEvent = await getOpenEvent()
    const tiers = openEvent ? await getTiersForEvent(openEvent.id) : []

    return {
        events: openEvent ? [openEvent] : [],
        tiers,
    }
}

export const actions: Actions = {
    default: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()

        const eventId = (data.get('eventId') as string)?.trim()
        const contactName = (data.get('contactName') as string)?.trim()
        const contactEmail = (data.get('contactEmail') as string)?.trim().toLowerCase()
        const contactPhone = (data.get('contactPhone') as string)?.trim()
        const status = (data.get('status') as string)?.trim()
        const selfTierId = (data.get('selfTierId') as string)?.trim()
        const selfBirthDate = (data.get('selfBirthDate') as string)?.trim()
        const selfShirtSize = (data.get('selfShirtSize') as string)?.trim()
        const selfAddressLine1 = (data.get('selfAddressLine1') as string)?.trim()
        const selfAddressLine2 = (data.get('selfAddressLine2') as string)?.trim()
        const selfAddressCity = (data.get('selfAddressCity') as string)?.trim()
        const selfAddressState = (data.get('selfAddressState') as string)?.trim()
        const selfAddressZip = (data.get('selfAddressZip') as string)?.trim()
        const selfVegetarianMeal = (data.get('selfVegetarianMeal') as string)?.trim()
        const selfAttendedReunion2025 = (data.get('selfAttendedReunion2025') as string)?.trim()
        const membersJson = data.get('members') as string

        if (!eventId) {
            return fail(400, { error: 'Event is required' })
        }
        if (!contactName) {
            return fail(400, { error: 'Contact name is required' })
        }
        if (!contactEmail) {
            return fail(400, { error: 'Contact email is required' })
        }
        if (!selfTierId) {
            return fail(400, { error: 'Please select a tier' })
        }
        if (contactPhone && !isValidPhone(contactPhone)) {
            return fail(400, { error: 'Please enter a valid phone number' })
        }
        if (!['paid', 'pending', 'waived'].includes(status)) {
            return fail(400, { error: 'Invalid payment status' })
        }

        type AdditionalMember = {
            name: string
            birthDate: string
            tierId: string
            shirtSize?: string
            addressLine1?: string
            addressLine2?: string
            addressCity?: string
            addressState?: string
            addressZip?: string
            vegetarianMeal?: string
            attendedReunion2025?: string
        }
        let additional: AdditionalMember[]
        try {
            additional = JSON.parse(membersJson)
        } catch {
            return fail(400, { error: 'Invalid member data' })
        }

        if (additional.some((m) => !m.name?.trim() || !m.tierId)) {
            return fail(400, { error: 'Each party member requires a name and tier' })
        }

        /* The contact is the first member of the party — their birthday and tier come
           from the self* fields. Additional members were added through the builder. */
        const members = [
            {
                name: contactName,
                birthDate: selfBirthDate,
                tierId: selfTierId,
                shirtSize: selfShirtSize || undefined,
                addressLine1: selfAddressLine1 || undefined,
                addressLine2: selfAddressLine2 || undefined,
                addressCity: selfAddressCity || undefined,
                addressState: selfAddressState || undefined,
                addressZip: selfAddressZip || undefined,
                vegetarianMeal: parseYesNo(selfVegetarianMeal),
                attendedReunion2025: parseYesNo(selfAttendedReunion2025),
            },
            ...additional.map((m) => ({
                name: m.name.trim(),
                birthDate: m.birthDate || undefined,
                tierId: m.tierId,
                shirtSize: m.shirtSize || undefined,
                addressLine1: m.addressLine1 || undefined,
                addressLine2: m.addressLine2 || undefined,
                addressCity: m.addressCity || undefined,
                addressState: m.addressState || undefined,
                addressZip: m.addressZip || undefined,
                vegetarianMeal: parseYesNo(m.vegetarianMeal),
                attendedReunion2025: parseYesNo(m.attendedReunion2025),
            })),
        ]

        const { registrationId } = await createAdminRegistration({
            eventId,
            contactName,
            contactEmail,
            contactPhone: contactPhone || undefined,
            status: status as 'paid' | 'pending' | 'waived',
            members,
        })

        return { success: true, registrationId }
    },
}
