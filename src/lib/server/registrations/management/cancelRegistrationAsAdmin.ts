import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { _performCancellation } from './_performCancellation'

/* An organiser cancelling someone else's registration, from the admin registration page.

   This exists because a paper registration could not be cancelled at all. setRegistrationStatus refuses
   'refunded' in both directions on purpose — writing that column alone would tell everyone the money
   went back when it had not — and cancelRegistration needs the management token, which the database only
   stores as a hash. So the only route was to email the registrant their own link and ask them to do it,
   for a family who paid by cheque and rang up to say they cannot come.

   Id-based and admin-guarded rather than token-gated, for the same reason as updateAdminMemberDetails:
   the token's plaintext is unavailable to admin code by design.

   THE EVENT PAIRING IS ENFORCED HERE, not just at the route. The registration page already 404s on a
   mismatched pair, but a cancellation is destructive and irreversible, so the check is repeated where the
   write happens rather than trusted from a caller — the same reasoning as the update_person action.

   Deliberately NOT restricted to paper registrations, though that is the case that prompted it. An
   organiser who needs to cancel a card payment on someone's behalf needs the refund to be issued, and
   _performCancellation is the code that does that correctly. Refusing card registrations here would
   leave the harder half of the job undone and invite someone to reach for raw SQL. */
export async function cancelRegistrationAsAdmin(params: {
    registrationId: string
    /* The event the URL claims. A registration belonging to another year is a 404, not a cancellation. */
    eventId: string
    registerUrl: string
}): Promise<void> {
    const [registration] = await db
        .select({
            id: registrations.id,
            eventId: registrations.eventId,
            status: registrations.status,
            stripeSessionId: registrations.stripeSessionId,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
        })
        .from(registrations)
        .where(eq(registrations.id, params.registrationId))
        .limit(1)

    if (!registration || registration.eventId !== params.eventId) {
        throw error(404, 'Registration not found for this event')
    }

    /* Already cancelled. Returning quietly rather than erroring makes a double-submitted confirmation
       harmless, and re-running the refunds would be pointless: the idempotency keys mean Stripe would
       return the originals anyway, but the email would go out a second time. */
    if (registration.status === 'refunded') {
        return
    }

    /* No lock-date check, unlike the registrant's own cancel. assertRegistrationEditable exists to stop
       a REGISTRANT changing their party after the organisers have sent numbers to the caterer — it is
       not a rule the organisers need protecting from. Someone who cannot come after the lock date is
       exactly the case an organiser has to be able to record. */
    await _performCancellation(registration, params.registerUrl)
}
