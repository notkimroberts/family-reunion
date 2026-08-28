import { asc } from 'drizzle-orm'
import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { user } from '$lib/server/db/schema'
import type { AdminUser } from './types'

/* The accounts that can sign in. Owner-only: this is Setup, and a remote function is served from
   /_app/remote/<id> with route handling skipped, so no layout or page guard covers it — the in-function
   guard is the entire protection.

   The registrations join is gone. It aggregated "paid registration event ids" by matching a
   registration's contact email against a user's, which is not a relationship — registration is fully
   public and needs no account, so the two email columns coincide only by chance. The users page used it
   to filter by the selected year, and since admins have no registrations that array was always empty:
   picking any year emptied the list, including the account Setup is now restricted to. */
export const getAdminUsers = query(async (): Promise<AdminUser[]> => {
    requireOwner(getRequestEvent())

    return db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(asc(user.name))
})
