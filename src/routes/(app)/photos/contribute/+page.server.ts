import { fail } from '@sveltejs/kit'
import { PHOTO_MAX_PER_REQUEST, PHOTO_MAX_UPLOAD_BYTES } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'
import { checkUploadRateLimit, createPhoto } from '$lib/server/photos'
import { getOpenEvent } from '$lib/server/registrations'
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
       CLAUDE.md. Locally the dev server has no such limit, which is exactly how that bug hides. */
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
                /* One unreadable file must not lose the rest of the batch. The likely causes are a
                   HEIC the build's libvips cannot decode, a truncated upload, or something that was
                   never an image; none of them is worth a stack trace to the visitor. */
                dbg.upload('rejected %s: %o', file.name, error)
                rejected.push(file.name)
            }
        }

        if (accepted === 0) {
            return fail(400, {
                message:
                    'None of those files could be read as a photo. JPEG, PNG, HEIC and WebP all work.',
            })
        }

        return {
            accepted,
            rejected,
            message:
                rejected.length > 0
                    ? `Thank you — ${accepted} photo${accepted === 1 ? '' : 's'} received. ${rejected.length} could not be read.`
                    : `Thank you — ${accepted} photo${accepted === 1 ? '' : 's'} received.`,
        }
    },
}
