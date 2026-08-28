import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

/* Corrects a registration's contact details.

   The email matters most. `/api/webhooks/resend` reports a bounced confirmation to Sentry, naming
   the registration — but until now nothing could act on that report: the address could not be fixed,
   and the management link could not be resent because only its hash is stored. So a typo'd address
   meant the registrant silently never received their link and there was no way back. This is the
   remediation path for an alert the app already raises.

   Returns what actually changed so the caller can decide whether the registrant needs telling and
   what to write to the audit log. An email change is the one case where the notification must go to
   the NEW address. */
export async function updateRegistrationContact(params: {
    registrationId: string
    contactName: string
    contactEmail: string
    contactPhone: string | undefined
}): Promise<{ changed: boolean; emailChanged: boolean; previousEmail: string }> {
    const [existing] = await db
        .select({
            status: registrations.status,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            contactPhone: registrations.contactPhone,
        })
        .from(registrations)
        .where(eq(registrations.id, params.registrationId))
        .limit(1)

    if (!existing) {
        throw error(404, 'Registration not found')
    }

    if (existing.status === 'refunded') {
        throw error(409, 'This registration was cancelled and refunded.')
    }

    /* Normalised here rather than in the schema: the schemas are shared with client-side validation,
       where a transform would rewrite what someone is mid-way through typing. */
    const contactName = params.contactName.trim()
    const contactEmail = params.contactEmail.trim().toLowerCase()
    const contactPhone = params.contactPhone?.trim() || null

    const emailChanged = contactEmail !== existing.contactEmail
    const changed =
        emailChanged ||
        contactName !== existing.contactName ||
        contactPhone !== existing.contactPhone

    if (!changed) {
        return { changed: false, emailChanged: false, previousEmail: existing.contactEmail }
    }

    await db
        .update(registrations)
        .set({ contactName, contactEmail, contactPhone, updatedAt: new Date() })
        .where(eq(registrations.id, params.registrationId))

    /* The contact is also an attendee, and their name is stored on that row too — it has to be, since
       every attendee needs a name. This is the ONE place that writes it, which is what stops the two
       from disagreeing. The admin form shows the contact's attendee name as read-only for the same
       reason. No-ops when the name did not change or the contact has no attendee row. */
    if (contactName !== existing.contactName) {
        await db
            .update(partyMembers)
            .set({ name: contactName })
            .where(
                and(
                    eq(partyMembers.registrationId, params.registrationId),
                    eq(partyMembers.isContact, true),
                ),
            )
    }

    dbg.register(
        'admin updated contact for registration %s (email changed: %s)',
        params.registrationId,
        emailChanged,
    )

    return { changed: true, emailChanged, previousEmail: existing.contactEmail }
}
