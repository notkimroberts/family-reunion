import { needsTwoFactorSetup } from './needsTwoFactorSetup'

type SignedIn = {
    user: NonNullable<App.Locals['user']>
    session: NonNullable<App.Locals['session']>
}

/* What hooks.server.ts puts on `locals` for a request's session.

   A session from an account that has not finished 2FA enrolment counts as signed out, so every guard
   refuses it (see needsTwoFactorSetup). `fallbackUser` is the dev admin, used only when there is NO
   session: a session awaiting setup does not fall back to it, because locally that is how the
   enrolment flow is exercised. */
export function sessionLocals(
    signedIn: SignedIn | null,
    fallbackUser: App.Locals['user'],
): Pick<App.Locals, 'user' | 'session'> {
    if (signedIn === null) {
        return { user: fallbackUser, session: null }
    }
    if (needsTwoFactorSetup(signedIn.user)) {
        return { user: null, session: null }
    }
    return { user: signedIn.user, session: signedIn.session }
}
