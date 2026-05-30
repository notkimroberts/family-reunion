import { error } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/auth/guards'
import { getRegistrationWithEvent, getRegistrationMembers } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const registrationId = event.url.searchParams.get('registration_id')
    if (!registrationId) throw error(404)

    const result = await getRegistrationWithEvent(registrationId)
    if (!result) throw error(404)

    const { registration, event: reunionEvent } = result

    if (registration.userId && registration.userId !== user.id) throw error(403)

    const members = await getRegistrationMembers(registrationId)

    return {
        registration,
        event: reunionEvent,
        members,
    }
}
