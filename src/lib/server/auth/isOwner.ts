import { OWNER_ROLE } from '$lib/general/constants'

/* Whether this user is the owner — the site admin. A role, safe as a boundary only because nothing
   an organizer can reach writes one: the admin plugin's /api/auth/admin/* is gone and /update-user
   refuses `role` (adminApi.test.ts). `bun run admin:set-role` is the only writer. See ADR 0010. */
export function isOwner(user: { role?: string | null } | null | undefined): boolean {
    return user?.role === OWNER_ROLE
}
