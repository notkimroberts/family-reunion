/* Whether this user is the owner — the one account allowed into Setup.

   Deliberately NOT keyed on `role`. Two independent hard-coded comparisons gate the whole app —
   `requireAdmin` and the (app) group layout both test `role === 'admin'` — so giving the owner any
   other role value, including better-auth's own comma format 'admin,owner', would lock them out of
   /admin, /family-tree, /gallery and the rest. Role is also self-service: better-auth's admin plugin
   mounts POST /api/auth/admin/set-role ahead of SvelteKit routing, its only check is that the caller
   is an admin, and there is no self-target guard — so any admin can already grant themselves any role.

   Identity is the thing that cannot be edited from inside the app, so identity is the gate.

   FAILS OPEN when ownerEmail is unset, and that is the deliberate trade-off: the degraded state is
   today's behaviour (any admin, never a stranger — the group layout still requires role 'admin'),
   whereas failing closed would mean a forgotten Railway variable locks the owner out of event settings
   and pricing. Wrong-but-recoverable beats right-but-bricked days before a launch. requireOwner
   reports the missing configuration so it cannot stay unnoticed. */
export function isOwner(
    user: { email?: string | null } | null | undefined,
    ownerEmail: string | undefined,
): boolean {
    const configured = ownerEmail?.trim().toLowerCase()
    if (!configured) {
        return true
    }
    return user?.email?.trim().toLowerCase() === configured
}
