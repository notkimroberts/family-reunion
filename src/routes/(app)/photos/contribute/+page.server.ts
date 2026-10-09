import { fail } from '@sveltejs/kit'
import { PHOTO_MAX_PER_REQUEST, PHOTO_MAX_UPLOAD_BYTES } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'
import { UnreadablePhotoError, checkUploadRateLimit, createPhoto } from '$lib/server/photos'
import { getOpenEvent } from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import type { Actions, PageServerLoad } from './$types'

const MAX_CAPTION_LENGTH = 280
const MAX_NAME_LENGTH = 80

export const load: PageServerLoad = async () => {
    return { maxBytes: PHOTO_MAX_UPLOAD_BYTES, maxPerRequest: PHOTO_MAX_PER_REQUEST }
}

/* Reads a bounded string field, or undefined. Everything here is untrusted free text from an
   endpoint with no credential, so it is length-capped on arrival and escaped on render. */
function readText(value: FormDataEntryValue | null, maxLength: number): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }
    const trimmed = value.trim().slice(0, maxLength)
    return trimmed.length > 0 ? trimmed : undefined
}

export const actions: Actions = {
    /* Accepts contributed photos. NO CREDENTIAL — see ADR 0009 for why, and for why that makes the
       three checks below load-bearing rather than defensive habit:

       1. The rate limit is the only throttle that exists, there being no account to suspend.
       2. The size cap is enforced before any decode, so a hostile file is refused rather than held.
       3. Every row is written 'pending'. Nothing here can publish anything.

       Note that adapter-node's BODY_SIZE_LIMIT defaults to 512K, which rejects the average phone
       photo before this action is ever reached. It is raised in the Railway service variables; see
       CLAUDE.md. Locally the dev server has no such limit, which is exactly how that bug hides.
       The limit is per REQUEST, not per file, so the page posts each photo on its own; a no-JS
       batch is one request and fails as a whole once its total passes the limit. */
    default: async ({ request, getClientAddress }) => {
        const formData = await request.formData()
        const files = formData
            .getAll('photos')
            .filter((entry): entry is File => entry instanceof File && entry.size > 0)

        if (files.length === 0) {
            return fail(400, { message: 'Choose at least one photo.' })
        }
        if (files.length > PHOTO_MAX_PER_REQUEST) {
            return fail(400, {
                message: `Please upload at most ${PHOTO_MAX_PER_REQUEST} photos at a time.`,
            })
        }

        const oversized = files.find((file) => file.size > PHOTO_MAX_UPLOAD_BYTES)
        if (oversized) {
            const limitMb = Math.floor(PHOTO_MAX_UPLOAD_BYTES / (1024 * 1024))
            return fail(400, { message: `"${oversized.name}" is larger than ${limitMb} MB.` })
        }

        const rateLimit = checkUploadRateLimit(getClientAddress(), files.length)
        if (!rateLimit.allowed) {
            return fail(429, {
                message: 'That is a lot of photos at once. Please try again a little later.',
            })
        }

        const caption = readText(formData.get('caption'), MAX_CAPTION_LENGTH)
        const contributorName = readText(formData.get('contributorName'), MAX_NAME_LENGTH)
        const openEvent = await getOpenEvent()

        let accepted = 0
        const rejected: string[] = []
        const unsaved: string[] = []

        for (const file of files) {
            try {
                await createPhoto({
                    bytes: new Uint8Array(await file.arrayBuffer()),
                    caption,
                    contributorName,
                    eventId: openEvent?.id,
                })
                accepted += 1
            } catch (error) {
                /* One failed file must not lose the rest of the batch. An unreadable file is the
                   visitor's problem and needs no stack trace. Anything else — the bucket, the
                   database — is ours: it is reported, and answered as worth a retry rather than
                   blamed on the photo. */
                if (error instanceof UnreadablePhotoError) {
                    dbg.upload('rejected %s: %o', file.name, error)
                    rejected.push(file.name)
                } else {
                    reportError('Contributed photo could not be stored', error, {
                        fileName: file.name,
                        size: file.size,
                    })
                    unsaved.push(file.name)
                }
            }
        }

        // The page sends one file per request, so these messages are shown beside that one file.
        const single = files.length === 1
        if (accepted === 0 && unsaved.length > 0) {
            return fail(503, {
                message: `${single ? 'This photo' : 'The photos'} could not be saved. Please try again in a minute.`,
            })
        }
        if (accepted === 0) {
            const subject = single ? 'This file' : 'None of those files'
            return fail(400, {
                message: `${subject} could not be read as a photo. JPEG, PNG, HEIC and WebP all work.`,
            })
        }

        const received = `Thank you — ${accepted} photo${accepted === 1 ? '' : 's'} received.`
        const notRead = rejected.length > 0 ? ` ${rejected.length} could not be read.` : ''
        const notSaved =
            unsaved.length > 0 ? ` ${unsaved.length} could not be saved; please send again.` : ''
        return { accepted, rejected, message: `${received}${notRead}${notSaved}` }
    },
}
