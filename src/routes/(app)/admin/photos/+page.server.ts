import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import { deleteFile } from '$lib/server/storage'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireOwner(event)
}

export const actions: Actions = {
    delete_photo: async (event) => {
        requireOwner(event)
        const data = await event.request.formData()
        const photoId = data.get('photoId') as string
        const r2Key = data.get('r2Key') as string

        if (!photoId) {
            return fail(400, { error: 'Missing photo ID' })
        }

        if (r2Key) {
            await deleteFile(r2Key)
        }

        await db.delete(photos).where(eq(photos.id, photoId))
        return { success: true }
    },
}
