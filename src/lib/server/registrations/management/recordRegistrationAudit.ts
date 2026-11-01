import { resolveActorUserId } from '$lib/server/auth/resolveActorUserId'
import { db } from '$lib/server/db'
import { registrationAudit, registrationAuditActionEnum } from '$lib/server/db/schema'
import { reportError } from '$lib/server/reportError'

export type RegistrationAuditAction = (typeof registrationAuditActionEnum.enumValues)[number]

/* Records one admin change to a registration.

   registrations.updated_at was the only trace, so with several organizers sharing the admin panel
   nobody could answer "who marked this paid?" or "who removed that person?". These are changes to
   other people's money and places, made by someone other than their owner.

   The actor's NAME is snapshotted alongside the id, and the id is only stored when it resolves to a
   real user row. Two reasons, one of which already bit:

   - actor_user_id is a foreign key. In dev there is no session, so hooks.server.ts substitutes a user
     whose id has no row — the FK rejected the insert and the whole audit write vanished. Every history
     entry for an admin edit was silently lost.
   - the FK is `on delete set null`, so removing an organizer's account erased who acted. An audit log
     that forgets its actor is not one. A name that is only ever read back needs no integrity guarantee.

   Never throws. An audit write failing must not roll back or block the change the organizer asked for,
   which has already happened by this point — a lost audit row is worth less than a save that reports
   failure after succeeding. But it is REPORTED, not swallowed: this used to log only through dbg, which
   is never enabled under `node build/index.js`, which is exactly why the dev breakage went unnoticed. */
export async function recordRegistrationAudit(params: {
    registrationId: string
    actor: { id: string; name: string } | undefined
    action: RegistrationAuditAction
    detail?: unknown
}): Promise<void> {
    try {
        await db.insert(registrationAudit).values({
            registrationId: params.registrationId,
            actorUserId: params.actor ? await resolveActorUserId(params.actor.id) : null,
            actorName: params.actor?.name ?? null,
            action: params.action,
            detail: params.detail ?? null,
        })
    } catch (err) {
        reportError('registration audit write failed', err, {
            registrationId: params.registrationId,
            action: params.action,
        })
    }
}
