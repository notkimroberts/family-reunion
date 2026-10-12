import { redirect } from '@sveltejs/kit'
import { auth } from '$lib/server/auth'
import { needsTwoFactorSetup } from '$lib/server/auth/needsTwoFactorSetup'
import type { PageServerLoad } from './$types'

/* The one page an account that has not enrolled in 2FA may open. hooks.server.ts nulls
   locals.user for exactly that session, so this load reads the session itself.

   Enrolling needs the password again (twoFactor.enable checks it), so a stolen session cookie
   alone cannot attach the thief's authenticator to the account. */
export const load: PageServerLoad = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
        throw redirect(302, '/login')
    }
    if (!needsTwoFactorSetup(session.user)) {
        throw redirect(302, '/admin')
    }
    return { email: session.user.email }
}
