import { eq } from 'drizzle-orm'
import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { photos, reunionEvents } from '$lib/server/db/schema'
import type { Photo } from './types'

// All photos joined with their event title; admin-only
export const getAdminPhotos = query(async (): Promise<Photo[]> => {
    requireOwner(getRequestEvent())

    return db
        .select({
            id: photos.id,
            url: photos.url,
            caption: photos.caption,
            r2Key: photos.r2Key,
            eventId: photos.eventId,
            createdAt: photos.createdAt,
            uploadedByUserId: photos.uploadedByUserId,
            eventTitle: reunionEvents.title,
        })
        .from(photos)
        .leftJoin(reunionEvents, eq(photos.eventId, reunionEvents.id))
})
