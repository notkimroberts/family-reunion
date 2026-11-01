import { error, fail, isHttpError } from '@sveltejs/kit'
import { desc, eq } from 'drizzle-orm'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { defaults, superValidate } from 'sveltekit-superforms/server'
import { sumAmountDue, sumMemberPrices } from '$lib/general/pricing'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrationAudit, user as userTable } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { getDonationsForEvent, getPaidGiftsForRegistration } from '$lib/server/donations'
import type { RegistrationChange } from '$lib/server/email'
import {
    addAdminMember,
    addRegistrationNote,
    cancelRegistrationAsAdmin,
    describeRegistrationChange,
    getEventPeople,
    getRegistrationMembers,
    getRegistrationNotes,
    getRegistrationWithEvent,
    getRegistrationsForEvent,
    neverConfirmed,
    notifyRegistrationUpdated,
    recordRegistrationAudit,
    reissueViewLink,
    removeAdminMember,
    setRegistrationStatus,
    settleMemberPayment,
    updateAdminMemberDetails,
    updateRegistrationContact,
} from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo } from '$lib/utils'
import type { Actions, PageServerLoad } from './$types'
import type { RegistrationActionFeedback } from './registrationActionFeedback'
import { adminEditRegistrationSchema, registrationNoteSchema, settleMemberSchema } from './schema'

const AUDIT_HISTORY_LIMIT = 50

/* A payment status in the registrant's words, for the before → after line in the update email.
   The email's lead already says what the new status means, so this only has to name it. */
const statusLabelValue = {
    paid: 'Paid',
    waived: 'Covered',
    pending: 'Awaiting payment',
    refunded: 'Cancelled',
} as const

/* The URL names both an event and a registration, and nothing makes them agree.
   /admin/event/<2024-id>/registrations/<a-2026-registration> would otherwise render the 2026 party
   inside the 2024 header, with the 2024 year switcher and the 2024 status banner — a page that is
   wrong about which reunion it is describing.

   Fetched here rather than read from the parent layout because the load and every action re-fetch
   independently, and a check that only one of them performs is not an invariant. */
async function loadPairedRegistration(params: { eventId: string; registrationId: string }) {
    const found = await getRegistrationWithEvent(params.registrationId)
    if (!found || found.registration.eventId !== params.eventId) {
        throw error(404, 'Registration not found')
    }
    return found
}

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const found = await loadPairedRegistration(event.params)

    /* The last three feed the event status panel beside the booking, the same one the list shows, so
       the year's figures stay in view while a booking is worked. */
    const [members, tiers, gifts, history, notes, eventRegistrations, eventPeople, eventDonations] =
        await Promise.all([
            getRegistrationMembers(event.params.registrationId),
            getTiersForEvent(found.registration.eventId),
            getPaidGiftsForRegistration(event.params.registrationId),
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
                /* Left join: a row whose organizer account was deleted has a null actorUserId, and the
               change still has to appear in the history. */
                .leftJoin(userTable, eq(registrationAudit.actorUserId, userTable.id))
                .where(eq(registrationAudit.registrationId, event.params.registrationId))
                .orderBy(desc(registrationAudit.createdAt))
                .limit(AUDIT_HISTORY_LIMIT),
            getRegistrationNotes(event.params.registrationId),
            getRegistrationsForEvent(event.params.eventId),
            getEventPeople(event.params.eventId),
            getDonationsForEvent(event.params.eventId),
        ])

    /* defaults() rather than superValidate() so opening the editor shows the current values with no
       errors on them; the action validates on submit. members/removedMemberIds start empty because the
       page's $state rows are the editing surface and sync into $form once, in onSubmit. */
    const form = defaults(
        {
            contactName: found.registration.contactName,
            contactEmail: found.registration.contactEmail,
            contactPhone: found.registration.contactPhone ?? '',
            /* '' for a booking that predates the question — see the schema. */
            stayingAtHostHotel: found.registration.stayingAtHostHotel ?? ('' as const),
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
        notes,
        /* Sum of the price snapshots, so a later tier reprice never rewrites this total. */
        totalCents: sumMemberPrices(members),
        /* The part of it nobody has paid, for people added after the booking was paid. Counted on a
           paid booking only — getRegistrationMoney decides. */
        amountDueCents: sumAmountDue(members),
        /* Gifts given with this booking. Kept apart from totalCents: a gift buys no place, and
           getRegistrationMoney feeds the panel, which adds gifts on its own. */
        giftCents: gifts.reduce((sum, gift) => sum + gift.amountCents, 0),
        eventRegistrations,
        eventPeople,
        eventDonations,
    }
}

/* The message an HttpError carries, or a fallback. A guard refusing is the useful case: its reason
   tells the organizer what to do instead. */
function refusalMessage(err: unknown, fallback: string): string {
    return isHttpError(err) ? err.body.message : fallback
}

export const actions: Actions = {
    /* One save for contact, status and every member. Batched so the registrant is told once: each
       notification rotates their view token, and rotating four times in one sitting would leave
       three dead links in their inbox. */
    save: async (event) => {
        const admin = requireAdmin(event)

        const form = await superValidate(event.request, zod(adminEditRegistrationSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const found = await loadPairedRegistration(event.params)
        if (found.registration.status === 'refunded') {
            const feedback: RegistrationActionFeedback = {
                saveError: 'This registration was cancelled and refunded, so it cannot be edited.',
            }
            return fail(409, { form, ...feedback })
        }

        const previousStatus = found.registration.status
        /* Read before the save changes the status: whether this email is the registrant's first. */
        const firstNotice = neverConfirmed(found.registration)
        /* Drives the "what changed" block in the email, so only things the registrant would care
           about belong in here. Edited values carry before → after. */
        const changes: RegistrationChange[] = []

        try {
            const contact = await updateRegistrationContact({
                registrationId: event.params.registrationId,
                contactName: form.data.contactName,
                contactEmail: form.data.contactEmail,
                contactPhone: form.data.contactPhone,
                stayingAtHostHotel: form.data.stayingAtHostHotel || undefined,
            })

            if (contact.changed) {
                changes.push(...contact.changes)
                await recordRegistrationAudit({
                    registrationId: event.params.registrationId,
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
                changes.push({ summary: `${removed.name} was removed from the party` })
                await recordRegistrationAudit({
                    registrationId: event.params.registrationId,
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
                    changes.push(...updated.changes)
                    await recordRegistrationAudit({
                        registrationId: event.params.registrationId,
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
                    registrationId: event.params.registrationId,
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

                changes.push({ summary: `${newMember.name} was added to your party` })
                await recordRegistrationAudit({
                    registrationId: event.params.registrationId,
                    actor: admin,
                    action: 'member_added',
                    detail: { memberId, name: newMember.name },
                })
            }

            if (form.data.status !== previousStatus) {
                await setRegistrationStatus({
                    registrationId: event.params.registrationId,
                    status: form.data.status,
                })
                changes.push({
                    summary: 'Payment status',
                    before: statusLabelValue[previousStatus],
                    after: statusLabelValue[form.data.status],
                })
                await recordRegistrationAudit({
                    registrationId: event.params.registrationId,
                    actor: admin,
                    action: 'status_changed',
                    detail: { from: previousStatus, to: form.data.status },
                })
            }
        } catch (err) {
            /* A guard refusing — a repricing on a paid party, emptying a party — arrives here as an
               HttpError. Surface its message rather than a generic failure: the reason IS the value,
               since it tells the organizer what to do instead. */
            const message = refusalMessage(err, 'Save failed')
            dbg.register(
                'admin save failed for registration %s: %o',
                event.params.registrationId,
                err,
            )
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
           present the save as failed — that sends the organizer back to redo work that already
           landed. Reported separately instead. */
        try {
            await notifyRegistrationUpdated({
                registrationId: event.params.registrationId,
                changeSummary: changes,
                viewUrl: (token) => `${event.url.origin}/register/view?token=${token}`,
                firstNotice,
            })
        } catch (err) {
            reportError('registration update notification failed', err, {
                registrationId: event.params.registrationId,
            })
            const feedback: RegistrationActionFeedback = {
                saved: true,
                notified: false,
                changes: changes.map(describeRegistrationChange),
                notifyError:
                    err instanceof Error
                        ? `${err.message} — the changes were saved, but they have not been told.`
                        : 'The changes were saved, but the notification email did not send.',
            }
            return { form, ...feedback }
        }

        const feedback: RegistrationActionFeedback = {
            saved: true,
            notified: true,
            changes: changes.map(describeRegistrationChange),
        }
        return { form, ...feedback }
    },

    /* Settles one person added after the booking was paid: their money arrived by Zelle or check, or
       the organizer decided not to charge for the place. A card payment settles itself through the
       webhook and never comes here.

       Its own action rather than part of save: it is one fact about one person, made from the Party
       table without opening the editor. The registrant is told, as for any other change to their
       booking — they were asked to pay, and should hear that it is done. */
    settle_member: async (event) => {
        const admin = requireAdmin(event)

        await loadPairedRegistration(event.params)

        const parsed = settleMemberSchema.safeParse(
            Object.fromEntries(await event.request.formData()),
        )
        if (!parsed.success) {
            const feedback: RegistrationActionFeedback = { settleError: 'Nothing to settle.' }
            return fail(400, feedback)
        }
        const { memberId, settlement } = parsed.data

        let name: string
        try {
            const settled = await settleMemberPayment({
                registrationId: event.params.registrationId,
                memberId,
                settlement,
            })
            name = settled.name
        } catch (err) {
            const feedback: RegistrationActionFeedback = {
                settleError: refusalMessage(err, 'Could not record the payment.'),
            }
            return fail(409, feedback)
        }

        await recordRegistrationAudit({
            registrationId: event.params.registrationId,
            actor: admin,
            action: 'member_updated',
            detail: { memberId, name, payment: settlement === 'paid' ? 'marked paid' : 'covered' },
        })

        const summary =
            settlement === 'paid'
                ? `Payment received for ${name}`
                : `${name}'s place is covered, so there is nothing to pay`

        try {
            await notifyRegistrationUpdated({
                registrationId: event.params.registrationId,
                changeSummary: [{ summary }],
                viewUrl: (token) => `${event.url.origin}/register/view?token=${token}`,
            })
        } catch (err) {
            reportError('registration update notification failed', err, {
                registrationId: event.params.registrationId,
            })
            const feedback: RegistrationActionFeedback = {
                settled: summary,
                notifyError: 'Recorded, but the email to the registrant did not send.',
            }
            return feedback
        }

        const feedback: RegistrationActionFeedback = { settled: summary }
        return feedback
    },

    /* Appends an organizer note. Paired like every action, so a note cannot land on a booking from
       another year through a hand-edited URL. Not audited: a note changes nothing about the booking. */
    add_note: async (event) => {
        const admin = requireAdmin(event)
        await loadPairedRegistration(event.params)

        const parsed = registrationNoteSchema.safeParse({
            body: (await event.request.formData()).get('body') ?? '',
        })
        if (!parsed.success) {
            const feedback: RegistrationActionFeedback = {
                noteError: parsed.error.issues[0]?.message ?? 'Could not save the note',
            }
            return fail(400, feedback)
        }

        await addRegistrationNote({
            registrationId: event.params.registrationId,
            author: admin,
            body: parsed.data.body,
        })

        const feedback: RegistrationActionFeedback = { noteAdded: true }
        return feedback
    },

    /* Rotates the token and emails a fresh link, for a registrant who has lost theirs. Their previous
       link keeps working for the grace period — see isViewTokenValid. */
    reissue_link: async (event) => {
        const admin = requireAdmin(event)

        /* Pairing checked here too. Not for authorization — any admin may re-issue any link — but so a
           stale or hand-edited URL cannot email a link on behalf of a year it does not belong to and
           then write the audit row under that year's page. */
        await loadPairedRegistration(event.params)

        try {
            await reissueViewLink({
                registrationId: event.params.registrationId,
                viewUrl: (token) => `${event.url.origin}/register/view?token=${token}`,
            })
        } catch (err) {
            /* The send failed, so nothing was rotated and the old link still works. Say so
               explicitly: an admin who thinks they have re-issued a link and has not is worse off
               than one who knows it failed. */
            reportError('admin re-issue view link failed', err, {
                registrationId: event.params.registrationId,
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
            registrationId: event.params.registrationId,
            actor: admin,
            action: 'link_reissued',
        })

        const feedback: RegistrationActionFeedback = { linkReissued: true }
        return feedback
    },

    /* Cancels the whole registration on the registrant's behalf, refunding whatever Stripe took.

       The ONLY way to cancel anything. Registrants used to cancel their own booking from
       /register/view on nothing but the view link; that went, along with add- and
       remove-member, so every refund now happens here. setRegistrationStatus refuses 'refunded' in
       both directions on purpose, so this action is the whole route.

       Guarded by requireAdmin like every action here, and cancelRegistrationAsAdmin re-checks the
       event pairing at the write itself, because this one is irreversible. */
    cancel: async (event) => {
        const admin = requireAdmin(event)

        await loadPairedRegistration(event.params)

        try {
            await cancelRegistrationAsAdmin({
                registrationId: event.params.registrationId,
                eventId: event.params.eventId,
                registerUrl: `${event.url.origin}/register`,
            })
        } catch (err) {
            /* A failed refund leaves the registration untouched — that is the contract
               _performCancellation holds, and it is why this can safely report and stop rather than
               leaving the organizer guessing whether the money moved. */
            reportError('admin cancel registration failed', err, {
                registrationId: event.params.registrationId,
            })
            const feedback: RegistrationActionFeedback = {
                cancelError:
                    err instanceof Error
                        ? `${err.message} Nothing has been cancelled.`
                        : 'Cancelling failed. Nothing has been cancelled.',
            }
            return fail(502, feedback)
        }

        /* 'status_changed' rather than a new enum value: that is what happened, and adding
           'registration_cancelled' would need a migration to record something the detail already says. */
        await recordRegistrationAudit({
            registrationId: event.params.registrationId,
            actor: admin,
            action: 'status_changed',
            detail: { to: 'refunded', reason: 'cancelled by organizer' },
        })

        const feedback: RegistrationActionFeedback = { cancelled: true }
        return feedback
    },
}
