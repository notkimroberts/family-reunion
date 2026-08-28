import { fail } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { dbg } from '$lib/server/debug'
import { sendRecoveryEmail } from '$lib/server/email'
import { getRegistrationsByEmail } from '$lib/server/registrations'
import { generateManagementToken } from '$lib/server/registrations/hashManagementToken'
import { rotateManagementToken } from '$lib/server/registrations/rotateManagementToken'
import { reportError } from '$lib/server/reportError'
import type { PageServerLoad, Actions } from './$types'
import { recoverSchema } from './schema'

export const load: PageServerLoad = async () => {
    const form = await superValidate(zod(recoverSchema))
    return { form }
}

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event.request, zod(recoverSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const { email } = form.data
        const matches = await getRegistrationsByEmail(email)

        dbg.register('recover email=%s matches=%d', email, matches.length)

        /* The DB stores only token hashes; we cannot reuse the original plaintext.
           Rotate per match — but ONLY persist the new hash if the email send succeeded.
           Otherwise the user is locked out: their old plaintext no longer hashes to anything
           in the DB and they never received the new one. Email-first, then commit.

           Rotation demotes the outgoing hash rather than dropping it, so a registrant who
           recovers a link while still holding a working one does not lose the old one — and an
           open manage tab, whose cookie holds that plaintext, survives. */
        await Promise.all(
            matches.map(async (registration) => {
                const { plaintext, hash } = generateManagementToken()
                const manageUrl = `${event.url.origin}/register/manage?token=${plaintext}`
                try {
                    await sendRecoveryEmail(email, {
                        eventTitle: registration.eventTitle,
                        manageUrl,
                    })
                } catch (err) {
                    /* Not rotating is the correct outcome — the old link still works — but the
                       registrant asked for an email and got nothing, and the generic success
                       response hides that from them. Somebody has to know. */
                    reportError('recovery email send failed; token not rotated', err, {
                        registrationId: registration.id,
                    })
                    return
                }
                await rotateManagementToken({ registrationId: registration.id, newHash: hash })
            }),
        )

        /* Return generic success to avoid email enumeration. */
        return { form, sent: true }
    },
}
