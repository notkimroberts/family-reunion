import { db } from '$lib/server/db'
import { registrationAudit, registrationAuditActionEnum } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

export type RegistrationAuditAction = (typeof registrationAuditActionEnum.enumValues)[number]

/* Records one admin change to a registration.

   registrations.updated_at was the only trace, so with several organisers sharing the admin panel
   nobody could answer "who marked this paid?" or "who removed that person?". These are changes to
   other people's money and places, made by someone other than their owner, which is exactly the
   case for keeping a history.

   Deliberately NOT thrown from: an audit write failing must not roll back or block the change the
   organiser actually asked for, which has already happened by this point. A lost audit row is worth
   less than a save that appears to fail after succeeding. It is reported instead. */
export async function recordRegistrationAudit(params: {
    registrationId: string
    actorUserId: string | undefined
    action: RegistrationAuditAction
    detail?: unknown
}): Promise<void> {
    try {
        await db.insert(registrationAudit).values({
            registrationId: params.registrationId,
            actorUserId: params.actorUserId ?? null,
            action: params.action,
            detail: params.detail ?? null,
        })
    } catch (err) {
        dbg.register(
            'audit write failed for registration %s action %s: %o',
            params.registrationId,
            params.action,
            err,
        )
    }
}
