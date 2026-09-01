import { randomUUID } from 'node:crypto'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { putObject } from '$lib/server/storage'
import { buildRenditions } from './_buildRenditions'

export type CreatePhotoInput = {
    bytes: Uint8Array
    caption?: string
    contributorName?: string
    eventId?: string
    takenYear?: number
    /* Only the archive import passes this. A contributed photo is always 'pending' — see ADR 0009. */
    status?: 'pending' | 'approved'
}

/* Processes and stores one photo, returning its id.

   Order matters: renditions first, bucket second, row last. A failure part-way leaves orphaned
   objects, which cost pennies and are invisible; the reverse order leaves a row pointing at bytes
   that do not exist, which renders a broken gallery to the public. */
export async function createPhoto(input: CreatePhotoInput): Promise<string> {
    const { display, thumb } = await buildRenditions(input.bytes)

    const id = randomUUID()
    const displayKey = `photos/${id}/display.jpg`
    const thumbKey = `photos/${id}/thumb.jpg`

    await Promise.all([
        putObject(displayKey, display.body, 'image/jpeg'),
        putObject(thumbKey, thumb.body, 'image/jpeg'),
    ])

    await db.insert(photos).values({
        id,
        eventId: input.eventId,
        status: input.status ?? 'pending',
        displayKey,
        thumbKey,
        width: display.width,
        height: display.height,
        caption: input.caption?.trim() || undefined,
        contributorName: input.contributorName?.trim() || undefined,
        takenYear: input.takenYear,
    })

    dbg.upload('stored photo %s (%dx%d)', id, display.width, display.height)
    return id
}
