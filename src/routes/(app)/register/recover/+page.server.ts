import { fail } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { dbg } from '$lib/server/debug'
import { sendRecoveryEmail } from '$lib/server/email'
import { getRegistrationsByEmail } from '$lib/server/registrations'
import { deliverManagementLink } from '$lib/server/registrations/deliverManagementLink'
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

        /* The DB stores only token hashes, so a recovery link is necessarily a NEW token — and the
           new hash is persisted only after the email is away. deliverManagementLink owns that
           ordering; here we only have to decide what a failure means, which is: report it, and leave
           the registrant's existing link working. */
        await Promise.all(
            matches.map(async (registration) => {
                try {
                    await deliverManagementLink({
                        registrationId: registration.id,
                        deliver: async (token) => {
                            await sendRecoveryEmail(email, {
                                eventTitle: registration.eventTitle,
                                manageUrl: `${event.url.origin}/register/manage?token=${token}`,
                            })
                            return 'sent'
                        },
                    })
                } catch (err) {
                    /* Not rotating is the correct outcome — the old link still works — but the
                       registrant asked for an email and got nothing, and the generic success
                       response hides that from them. Somebody has to know. */
                    reportError('recovery email send failed; token not rotated', err, {
                        registrationId: registration.id,
                    })
                }
            }),
        )

        /* Return generic success to avoid email enumeration. */
        return { form, sent: true }
    },
}
