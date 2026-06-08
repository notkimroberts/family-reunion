import { fail } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth/guards'
import { createAdminRegistration, getOpenEvent, getEventTiers } from '$lib/server/registrations'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const openEvent = await getOpenEvent()
    const tiers = openEvent ? await getEventTiers(openEvent.id) : []

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
        const status = (data.get('status') as string)?.trim()
        const selfTierId = (data.get('selfTierId') as string)?.trim()
        const selfBirthDate = (data.get('selfBirthDate') as string)?.trim()
        const selfShirtSize = (data.get('selfShirtSize') as string)?.trim()
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
            return fail(400, { error: 'Pricing tier could not be determined from birthday' })
        }
        if (!selfBirthDate) {
            return fail(400, { error: 'Contact birthday is required' })
        }
        if (!['paid', 'pending', 'waived'].includes(status)) {
            return fail(400, { error: 'Invalid payment status' })
        }

        type AdditionalMember = {
            name: string
            birthDate: string
            tierId: string
            shirtSize?: string
        }
        let additional: AdditionalMember[]
        try {
            additional = JSON.parse(membersJson)
        } catch {
            return fail(400, { error: 'Invalid member data' })
        }

        if (additional.some((m) => !m.name?.trim() || !m.tierId)) {
            return fail(400, { error: 'Each party member requires a name and pricing tier' })
        }

        /* The contact is the first member of the party — their birthday and tier come
           from the self* fields. Additional members were added through the builder. */
        const members = [
            {
                name: contactName,
                birthDate: selfBirthDate,
                tierId: selfTierId,
                shirtSize: selfShirtSize || undefined,
            },
            ...additional.map((m) => ({
                name: m.name.trim(),
                birthDate: m.birthDate || undefined,
                tierId: m.tierId,
                shirtSize: m.shirtSize || undefined,
            })),
        ]

        const { registrationId } = await createAdminRegistration({
            eventId,
            contactName,
            contactEmail,
            status: status as 'paid' | 'pending' | 'waived',
            members,
        })

        return { success: true, registrationId }
    },
}
