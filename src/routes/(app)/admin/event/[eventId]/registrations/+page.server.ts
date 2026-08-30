import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { env } from '$env/dynamic/private'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import {
    getEventPeople,
    getRegistrationsForEvent,
    recordRegistrationAudit,
    updateAdminMemberDetails,
} from '$lib/server/registrations'
import { parseYesNo } from '$lib/utils'
import type { Actions, PageServerLoad } from './$types'

/* Two lenses on one event, chosen by ?view=. Bookings is the default because chasing money is the
   recurring job; people is what you print, cater and check names against on the day. */
export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* Both are loaded on every visit, not one per lens. The status panel's head count needs the
       bookings, and toggling the lens has to be instant — a round trip to swap a table you are already
       looking at reads as a page you broke. Two indexed queries on a few hundred rows. */
    const [registrations, people] = await Promise.all([
        getRegistrationsForEvent(event.params.eventId),
        getEventPeople(event.params.eventId),
    ])

    return {
        registrations,
        people,
        /* Which Stripe dashboard a payment link should point at. Test and live PaymentIntent ids look
           alike, so the id cannot say — but the secret key can, and this is the only place that sees it.
           A test id under the live path shows "no such payment", which reads as a lost payment. */
        stripeTestMode: env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? true,
    }
}

export const actions: Actions = {
    /* Corrects the details an organiser fills in from a phone call or a stack of paper forms: shirt size,
       birthday, dietary answer, and whether they came last time. Edited straight from the People lens,
       because that is where the gaps are visible and where the shirt and meal counts they feed are read.

       DELIBERATELY DOES NOT EMAIL THE REGISTRANT, unlike the save on the registration detail page. That
       one rotates their management token and sends a summary because it can change what they owe and who
       is in their party. This changes neither. Emailing "your details were updated" for each dietary
       toggle while an organiser fills in eight gaps would train them to ignore the message that carries
       their only working link — and that link is their sole credential.

       It is still audited, so the change is accountable rather than invisible. */
    update_person: async (event) => {
        const admin = requireAdmin(event)

        const data = await event.request.formData()
        const memberId = String(data.get('memberId') ?? '').trim()
        if (!memberId) {
            return fail(400, { personError: 'Missing party member' })
        }

        /* The URL claims an event, so the action enforces it. Without this a POST aimed at one year could
           edit an attendee of another — the same pairing invariant the registration detail page holds. */
        const [owner] = await db
            .select({
                registrationId: registrations.id,
                eventId: registrations.eventId,
            })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            .where(eq(partyMembers.id, memberId))
            .limit(1)

        if (!owner || owner.eventId !== event.params.eventId) {
            throw error(404, 'Attendee not found for this event')
        }

        /* Only fields the form actually sent. Each cell is its own form posting one field, so `has` is
           what separates "not part of this change" from a deliberate value — reading a missing key as ''
           would let a dietary toggle wipe the birthday beside it.

           parseYesNo maps '' to undefined, and updateAdminMemberDetails reads undefined as "leave this
           field alone", so a still-blank answer writes nothing rather than a guess. birthDate is
           different: an empty string IS a clear, which the updater turns into three nulls — as is
           shirtSize, which the updater turns into null. Neither select offers the blank as a choice, so
           a clear can only arrive from a deliberate posted value. */
        const updated = await updateAdminMemberDetails({
            memberId,
            birthDate: data.has('birthDate') ? String(data.get('birthDate')) : undefined,
            shirtSize: data.has('shirtSize') ? String(data.get('shirtSize')) : undefined,
            vegetarianMeal: data.has('vegetarianMeal')
                ? parseYesNo(String(data.get('vegetarianMeal')))
                : undefined,
            attendedReunion2025: data.has('attendedReunion2025')
                ? parseYesNo(String(data.get('attendedReunion2025')))
                : undefined,
        })

        if (updated.changed) {
            await recordRegistrationAudit({
                registrationId: owner.registrationId,
                actor: admin,
                action: 'member_updated',
                detail: { memberId, name: updated.name },
            })
        }

        return { personSaved: true }
    },
}
