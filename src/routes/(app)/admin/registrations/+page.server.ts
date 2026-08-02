import { fail } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth/guards'
import { createAdminRegistration, getOpenEvent } from '$lib/server/registrations'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import { isValidPhone } from '$lib/utils'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const openEvent = await getOpenEvent()

    return {
        events: openEvent ? [openEvent] : [],
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
        const selfCategoryRaw = (data.get('selfCategory') as string)?.trim()
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
        if (selfCategoryRaw !== 'adult' && selfCategoryRaw !== 'child') {
            return fail(400, { error: 'Please select a category' })
        }
        if (contactPhone && !isValidPhone(contactPhone)) {
            return fail(400, { error: 'Please enter a valid phone number' })
        }
        if (!['paid', 'pending', 'waived'].includes(status)) {
            return fail(400, { error: 'Invalid payment status' })
        }

        const selfCategory: RegistrationCategory = selfCategoryRaw

        type AdditionalMember = {
            name: string
            birthDate: string
            category: string
            shirtSize?: string
        }
        let additional: AdditionalMember[]
        try {
            additional = JSON.parse(membersJson)
        } catch {
            return fail(400, { error: 'Invalid member data' })
        }

        if (
            additional.some(
                (m) => !m.name?.trim() || (m.category !== 'adult' && m.category !== 'child'),
            )
        ) {
            return fail(400, { error: 'Each party member requires a name and category' })
        }

        /* The contact is the first member of the party — their birthday and category come
           from the self* fields. Additional members were added through the builder. */
        const members = [
            {
                name: contactName,
                birthDate: selfBirthDate,
                category: selfCategory,
                shirtSize: selfShirtSize || undefined,
            },
            ...additional.map((m) => ({
                name: m.name.trim(),
                birthDate: m.birthDate || undefined,
                category: m.category as RegistrationCategory,
                shirtSize: m.shirtSize || undefined,
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
