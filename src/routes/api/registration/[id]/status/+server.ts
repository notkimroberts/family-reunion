import { json, error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async (event) => {
    const user = requireAuth(event)
    const { id } = event.params

    const [registration] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(and(eq(registrations.id, id), eq(registrations.userId, user.id)))
        .limit(1)

    if (!registration) {
        throw error(404)
    }

    return json({ status: registration.status })
}
