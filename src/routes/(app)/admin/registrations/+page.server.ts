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
        if (!['paid', 'pending', 'waived'].includes(status)) {
            return fail(400, { error: 'Invalid payment status' })
        }

        type MemberEntry = { name: string; birthDate: string; tierId: string; shirtSize?: string }
        let members: MemberEntry[]
        try {
            members = JSON.parse(membersJson)
        } catch {
            return fail(400, { error: 'Invalid member data' })
        }

        if (members.length === 0) {
            return fail(400, { error: 'At least one party member is required' })
        }
        if (members.some((m) => !m.name?.trim() || !m.tierId)) {
            return fail(400, { error: 'Each party member requires a name and pricing tier' })
        }

        const { registrationId } = await createAdminRegistration({
            eventId,
            contactName,
            contactEmail,
            status: status as 'paid' | 'pending' | 'waived',
            members: members.map((m) => ({
                name: m.name,
                birthDate: m.birthDate || undefined,
                tierId: m.tierId,
                shirtSize: m.shirtSize || undefined,
            })),
        })

        return { success: true, registrationId }
    },
}
