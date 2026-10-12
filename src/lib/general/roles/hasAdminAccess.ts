import { ORGANIZER_ROLE, OWNER_ROLE } from '$lib/general/constants'

const ADMIN_ACCESS_ROLES: ReadonlyArray<string> = [ORGANIZER_ROLE, OWNER_ROLE]

/* Whether a role may use the admin area at all — organizer or owner. Every "is this an admin" test
   goes through here: the owner holds a role of its own, so a bare `role === 'admin'` locks them out. */
export function hasAdminAccess(role: string | null | undefined): boolean {
    return role !== null && role !== undefined && ADMIN_ACCESS_ROLES.includes(role)
}
