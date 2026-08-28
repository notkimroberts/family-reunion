import { error, fail } from '@sveltejs/kit'
import { desc, eq } from 'drizzle-orm'
import { defaults } from 'sveltekit-superforms'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrationAudit, user as userTable } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import {
    addAdminMember,
    getRegistrationMembers,
    getRegistrationWithEvent,
    notifyRegistrationUpdated,
    recordRegistrationAudit,
    reissueManagementLink,
    removeAdminMember,
    setRegistrationStatus,
    updateAdminMemberDetails,
    updateRegistrationContact,
} from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo } from '$lib/utils'
import type { PageServerLoad, Actions } from './$types'
import type { RegistrationActionFeedback } from './registrationActionFeedback'
import { adminEditRegistrationSchema } from './schema'

const AUDIT_HISTORY_LIMIT = 50

/* Phrased for the registrant, who is the one who reads it — not for the organiser who set it. */
const statusChangeCopyValue = {
    paid: 'Your payment has been recorded — your registration is complete',
    waived: 'Your place has been covered, so there is nothing to pay',
    pending: 'Your registration is marked as awaiting payment',
} as const

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const found = await getRegistrationWithEvent(event.params.id)
    if (!found) {
        throw error(404, 'Registration not found')
    }

    const [members, tiers, history] = await Promise.all([
        getRegistrationMembers(event.params.id),
        getTiersForEvent(found.registration.eventId),
        db
            .select({
                id: registrationAudit.id,
                action: registrationAudit.action,
                detail: registrationAudit.detail,
                createdAt: registrationAudit.createdAt,
                /* The snapshot is the reliable one; the join is only a fallback for rows written
                   before actor_name existed. See recordRegistrationAudit. */
                actorName: registrationAudit.actorName,
                joinedActorName: userTable.name,
            })
            .from(registrationAudit)
            /* Left join: a row whose organiser account was deleted has a null actorUserId, and the
               change still has to appear in the history. */
            .leftJoin(userTable, eq(registrationAudit.actorUserId, userTable.id))
            .where(eq(registrationAudit.registrationId, event.params.id))
            .orderBy(desc(registrationAudit.createdAt))
            .limit(AUDIT_HISTORY_LIMIT),
    ])

    /* defaults() rather than superValidate() so opening the editor shows the current values with no
       errors on them; the action validates on submit. members/removedMemberIds start empty because the
       page's $state rows are the editing surface and sync into $form once, in onSubmit. */
    const form = defaults(
        {
            contactName: found.registration.contactName,
            contactEmail: found.registration.contactEmail,
            contactPhone: found.registration.contactPhone ?? '',
            status:
                found.registration.status === 'refunded' ? 'pending' : found.registration.status,
            members: [],
            newMembers: [],
            removedMemberIds: [],
        },
        zod(adminEditRegistrationSchema),
    )

    return {
        form,
        registration: found.registration,
        event: found.event,
        members,
        tiers,
        history,
        /* Sum of the price snapshots, so a later tier reprice never rewrites this total. */
        totalCents: members.reduce((sum, member) => sum + member.priceCents, 0),
    }
}

export const actions: Actions = {
    /* One save for contact, status and every member. Batched so the registrant is told once: each
       notification rotates their management token, and rotating four times in one sitting would leave
       three dead links in their inbox. */
    save: async (event) => {
        const admin = requireAdmin(event)

        const form = await superValidate(event.request, zod(adminEditRegistrationSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const found = await getRegistrationWithEvent(event.params.id)
        if (!found) {
            throw error(404, 'Registration not found')
        }
        if (found.registration.status === 'refunded') {
            const feedback: RegistrationActionFeedback = {
                saveError: 'This registration was cancelled and refunded, so it cannot be edited.',
            }
            return fail(409, { form, ...feedback })
        }

        const previousStatus = found.registration.status
        /* Drives both the audit rows and the "what changed" block in the email, so only things the
           registrant would care about belong in here. */
        const changes: string[] = []

        try {
            const contact = await updateRegistrationContact({
                registrationId: event.params.id,
                contactName: form.data.contactName,
                contactEmail: form.data.contactEmail,
                contactPhone: form.data.contactPhone,
            })

            if (contact.changed) {
                changes.push(
                    contact.emailChanged
                        ? `Your contact email was changed to ${form.data.contactEmail}`
                        : 'Your contact details were updated',
                )
                await recordRegistrationAudit({
                    registrationId: event.params.id,
                    actor: admin,
                    action: 'contact_updated',
                    detail: contact.emailChanged
                        ? { previousEmail: contact.previousEmail, email: form.data.contactEmail }
                        : { name: form.data.contactName },
                })
            }

            /* Removals first, so a member removed in this sitting is not also updated. */
            for (const memberId of form.data.removedMemberIds) {
                const removed = await removeAdminMember({ memberId })
                changes.push(`${removed.name} was removed from the party`)
                await recordRegistrationAudit({
                    registrationId: event.params.id,
                    actor: admin,
                    action: 'member_removed',
                    detail: { memberId, name: removed.name },
                })
            }

            const removedIds = new Set(form.data.removedMemberIds)
            for (const member of form.data.members) {
                if (removedIds.has(member.memberId)) {
                    continue
                }

                const updated = await updateAdminMemberDetails({
                    memberId: member.memberId,
                    name: member.name,
                    tierId: member.tierId,
                    birthDate: member.birthDate ?? '',
                    shirtSize: member.shirtSize ?? '',
                    vegetarianMeal: parseYesNo(member.vegetarianMeal),
                    attendedReunion2025: parseYesNo(member.attendedReunion2025),
                })

                if (updated.changed) {
                    changes.push(`${updated.name}'s details were updated`)
                    await recordRegistrationAudit({
                        registrationId: event.params.id,
                        actor: admin,
                        action: 'member_updated',
                        detail: { memberId: member.memberId, name: updated.name },
                    })
                }
            }

            /* Additions last among the party changes, so a staged person cannot be caught by the
               removal loop or the edit loop above. Allowed even when the registration is paid: adding
               an offline place at face value owes nobody a refund, unlike a reprice or a removal. */
            for (const newMember of form.data.newMembers) {
                const { memberId } = await addAdminMember({
                    registrationId: event.params.id,
                    member: {
                        name: newMember.name,
                        tierId: newMember.tierId,
                        birthDate: newMember.birthDate || undefined,
                        shirtSize: newMember.shirtSize || undefined,
                        addressLine1: newMember.addressLine1,
                        addressLine2: newMember.addressLine2,
                        addressCity: newMember.addressCity,
                        addressState: newMember.addressState,
                        addressZip: newMember.addressZip,
                        vegetarianMeal: parseYesNo(newMember.vegetarianMeal),
                        attendedReunion2025: parseYesNo(newMember.attendedReunion2025),
                    },
                })

                changes.push(`${newMember.name} was added to your party`)
                await recordRegistrationAudit({
                    registrationId: event.params.id,
                    actor: admin,
                    action: 'member_added',
                    detail: { memberId, name: newMember.name },
                })
            }

            if (form.data.status !== previousStatus) {
                await setRegistrationStatus({
                    registrationId: event.params.id,
                    status: form.data.status,
                })
                changes.push(statusChangeCopyValue[form.data.status])
                await recordRegistrationAudit({
                    registrationId: event.params.id,
                    actor: admin,
                    action: 'status_changed',
                    detail: { from: previousStatus, to: form.data.status },
                })
            }
        } catch (err) {
            /* A guard refusing — a repricing on a paid party, emptying a party — arrives here as an
               HttpError. Surface its message rather than a generic failure: the reason IS the value,
               since it tells the organiser what to do instead. */
            const message =
                typeof err === 'object' && err !== null && 'body' in err
                    ? String((err as { body: { message?: string } }).body?.message ?? 'Save failed')
                    : 'Save failed'
            dbg.register('admin save failed for registration %s: %o', event.params.id, err)
            const feedback: RegistrationActionFeedback = { saveError: message }
            return fail(409, { form, ...feedback })
        }

        if (changes.length === 0) {
            const feedback: RegistrationActionFeedback = {
                saved: true,
                notified: false,
                changes: [],
            }
            return { form, ...feedback }
        }

        /* Everything above is committed by this point. A failed notification must therefore NOT
           present the save as failed — that sends the organiser back to redo work that already
           landed. Reported separately instead. */
        try {
            await notifyRegistrationUpdated({
                registrationId: event.params.id,
                changeSummary: changes,
                manageUrl: (token) => `${event.url.origin}/register/manage?token=${token}`,
            })
        } catch (err) {
            reportError('registration update notification failed', err, {
                registrationId: event.params.id,
            })
            const feedback: RegistrationActionFeedback = {
                saved: true,
                notified: false,
                changes,
                notifyError:
                    err instanceof Error
                        ? `${err.message} — the changes were saved, but they have not been told.`
                        : 'The changes were saved, but the notification email did not send.',
            }
            return { form, ...feedback }
        }

        const feedback: RegistrationActionFeedback = { saved: true, notified: true, changes }
        return { form, ...feedback }
    },

    /* Rotates the token and emails a fresh link, for a registrant who has lost theirs. Their previous
       link keeps working for the grace period — see isManagementTokenValid. */
    reissue_link: async (event) => {
        const admin = requireAdmin(event)

        try {
            await reissueManagementLink({
                registrationId: event.params.id,
                manageUrl: (token) => `${event.url.origin}/register/manage?token=${token}`,
            })
        } catch (err) {
            /* The send failed, so nothing was rotated and the old link still works. Say so
               explicitly: an admin who thinks they have re-issued a link and has not is worse off
               than one who knows it failed. */
            reportError('admin re-issue management link failed', err, {
                registrationId: event.params.id,
            })
            const feedback: RegistrationActionFeedback = {
                reissueError:
                    err instanceof Error
                        ? `${err.message} — their existing link still works.`
                        : 'Sending failed; their existing link still works.',
            }
            return fail(502, feedback)
        }

        await recordRegistrationAudit({
            registrationId: event.params.id,
            actor: admin,
            action: 'link_reissued',
        })

        const feedback: RegistrationActionFeedback = { linkReissued: true }
        return feedback
    },
}
