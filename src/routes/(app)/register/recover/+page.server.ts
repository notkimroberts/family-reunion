import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRecoveryEmail } from '$lib/server/email'
import { getRegistrationsByEmail } from '$lib/server/registrations'
import { generateManagementToken } from '$lib/server/registrations/hashManagementToken'
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
           in the DB and they never received the new one. Email-first, then commit. */
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
                    dbg.register(
                        'recover email send failed for registration=%s; not rotating: %o',
                        registration.id,
                        err,
                    )
                    return
                }
                await db
                    .update(registrations)
                    .set({ managementToken: hash, updatedAt: new Date() })
                    .where(eq(registrations.id, registration.id))
            }),
        )

        /* Return generic success to avoid email enumeration. */
        return { form, sent: true }
    },
}
