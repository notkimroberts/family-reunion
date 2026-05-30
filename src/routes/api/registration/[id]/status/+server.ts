import { json, error } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/auth/guards'
import { getRegistrationStatus } from '$lib/server/registrations'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async (event) => {
    const user = requireAuth(event)
    const { id } = event.params

    const status = await getRegistrationStatus(id, user.id)

    if (status === null) {
        throw error(404)
    }

    return json({ status })
}
