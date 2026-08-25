import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRecoveryEmail } from '$lib/server/email'
import { generateManagementToken } from '../hashManagementToken'
import { getRegistrationWithEvent } from '../queries/getRegistrationWithEvent'

/* Emails the registrant a fresh management link, for when an organiser needs to get them back
   into their registration.

   This necessarily ROTATES the token rather than resending the old one. The database stores only
   sha256(token), so the original plaintext cannot be recovered by anyone, including an admin —
   the caller must tell the registrant their previous link will stop working.

   Ordering is load-bearing: the new hash is persisted only AFTER a confirmed send. Rotating
   first would mean a failed send leaves the registrant with an old link that no longer hashes to
   anything stored and a new one they never received — locked out permanently, unrecoverable.
   That exact bug shipped once, because the Resend SDK resolves with { data, error } instead of
   throwing and send() was not inspecting it. send() now throws, which is what makes this
   ordering effective rather than decorative. */
export async function reissueManagementLink(params: {
    registrationId: string
    /* Builds the manage URL from the fresh plaintext token; the caller owns the origin. */
    manageUrl: (token: string) => string
}): Promise<void> {
    const found = await getRegistrationWithEvent(params.registrationId)
    if (!found) {
        throw error(404, 'Registration not found')
    }

    const { plaintext, hash } = generateManagementToken()

    await sendRecoveryEmail(found.registration.contactEmail, {
        eventTitle: found.event.title,
        manageUrl: params.manageUrl(plaintext),
    })

    /* Only now that delivery is confirmed. */
    await db
        .update(registrations)
        .set({ managementToken: hash, updatedAt: new Date() })
        .where(eq(registrations.id, params.registrationId))

    dbg.register('admin re-issued management link for registration %s', params.registrationId)
}
