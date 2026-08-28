import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { generateManagementToken } from '../hashManagementToken'
import { getConfirmationEmailData } from '../queries/getConfirmationEmailData'
import { rotateManagementToken } from '../rotateManagementToken'

/* Derives the Resend idempotency key from what changed, rather than from the registration or the
   clock. sendRegistrationConfirmation is called elsewhere with `confirm/<registrationId>`; reusing a
   per-registration key here would make Resend silently drop every update after the first — told once
   and never again, worse than not having the feature. A timestamp goes too far the other way and lets
   a double-submitted save send twice. Hashing the summary suppresses a retry of the same save while
   letting a genuinely different change through. */
function changeFingerprint(changeSummary: string[]): string {
    return createHash('sha256').update(changeSummary.join('|')).digest('hex').slice(0, 16)
}

/* Tells the registrant that an organiser changed their registration, and gives them a link that
   works.

   Rotates because it must: only sha256(token) is stored, so the link in the email has to be a fresh
   one. Rotation demotes rather than discards, so the link they already had keeps working for the
   grace period — see isManagementTokenValid. Without that this notification would break the very
   access it is announcing.

   Send-before-persist, like every other rotation site: a failed send must leave the old token
   working rather than strand them between a dead link and one they never got. This throws on send
   failure, and the caller is expected to report it WITHOUT failing the save — the organiser's change
   is already committed by then, so presenting it as failed would be a lie. */
export async function notifyRegistrationUpdated(params: {
    registrationId: string
    changeSummary: string[]
    manageUrl: (token: string) => string
}): Promise<{ sent: boolean }> {
    if (params.changeSummary.length === 0) {
        return { sent: false }
    }

    const { plaintext, hash } = generateManagementToken()

    const payload = await getConfirmationEmailData({
        registrationId: params.registrationId,
        manageUrl: params.manageUrl(plaintext),
    })

    /* undefined covers a missing registration/event and a refunded one, none of which has an update
       worth announcing. Nothing was rotated, so nothing is broken. */
    if (!payload) {
        dbg.email('no update notification for registration %s', params.registrationId)
        return { sent: false }
    }

    await sendRegistrationConfirmation(
        payload.to,
        { ...payload.data, isUpdate: true, changeSummary: params.changeSummary },
        `update/${params.registrationId}/${changeFingerprint(params.changeSummary)}`,
    )

    await rotateManagementToken({ registrationId: params.registrationId, newHash: hash })

    /* Stamped after the send so the row's updatedAt reflects the notified state. */
    await db
        .update(registrations)
        .set({ updatedAt: new Date() })
        .where(eq(registrations.id, params.registrationId))

    dbg.email(
        'sent update notification for registration %s (%d change(s))',
        params.registrationId,
        params.changeSummary.length,
    )

    return { sent: true }
}
