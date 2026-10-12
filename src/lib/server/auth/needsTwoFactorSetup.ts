/* Whether a signed-in account must finish 2FA enrollment before it counts as signed in.

   Better Auth's twoFactor plugin only CHALLENGES accounts that already enrolled; it never makes
   anyone enroll. So an account with a password and no 2FA would sign in on the password alone,
   which is exactly the account a phished password unlocks. sessionLocals uses this so
   hooks.server.ts sets `locals.user = null` for such a session, so every existing guard
   (requireAdmin, the (app) layout, actions, remote functions) refuses it without knowing 2FA
   exists. The two places that still need the session read it themselves: Better Auth's own
   /api/auth/* endpoints, and the enrollment page's load (TWO_FACTOR_SETUP_PATH).

   Every account, not only admins: sign-up is disabled, so every account IS an admin, and a role
   test here would be a second place the role must be right.

   The column is nullable (the plugin's own definition), so null counts as "not yet" as false does. */
export function needsTwoFactorSetup(user: { twoFactorEnabled?: boolean | null }): boolean {
    return user.twoFactorEnabled !== true
}
