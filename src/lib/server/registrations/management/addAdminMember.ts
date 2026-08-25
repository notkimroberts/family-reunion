import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { resolveTierPricing } from '$lib/server/tiers'
import { parseBirthDate } from '$lib/utils/age'
import type { MemberInput } from '../checkout'

/* Adds one party member to an existing registration, offline.

   Id-based and admin-guarded rather than token-gated: the caller is an organiser, and the
   database stores only sha256(token), so admin code cannot present the plaintext the
   registrant-facing management functions require.

   Deliberately different from addMember (checkout/addMember.ts) in two ways:

   - It never touches Stripe. addMember always opens a Checkout session, which is wrong for a
     family paying by cheque.
   - It snapshots the tier's NET priceCents, exactly as createAdminRegistration does, so an
     offline addition sits on the same price basis as the rest of the party rather than carrying
     a Stripe gross-up. stripePaymentIntentId stays null, which is also what marks the row as
     never having been charged online.

   Also deliberately does NOT call assertRegistrationEditable: an admin must be able to record a
   late arrival after the public lock date, consistent with createAdminRegistration. */
export async function addAdminMember(params: {
    registrationId: string
    member: MemberInput
}): Promise<{ memberId: string }> {
    const [registration] = await db
        .select({ status: registrations.status, eventId: registrations.eventId })
        .from(registrations)
        .where(eq(registrations.id, params.registrationId))
        .limit(1)

    if (!registration) {
        throw error(404, 'Registration not found')
    }

    /* A refunded registration has been cancelled and its money returned; adding to it would
       create an attendee nobody has paid for and that no total accounts for. */
    if (registration.status === 'refunded') {
        throw error(409, 'Cannot add members to a cancelled registration')
    }

    const pricingByTierId = await resolveTierPricing(registration.eventId, [params.member.tierId])
    const pricing = pricingByTierId[params.member.tierId]

    const parsed = params.member.birthDate ? parseBirthDate(params.member.birthDate) : null

    const [inserted] = await db
        .insert(partyMembers)
        .values({
            registrationId: params.registrationId,
            name: params.member.name.trim(),
            birthYear: parsed?.birthYear ?? null,
            birthMonth: parsed?.birthMonth ?? null,
            birthDay: parsed?.birthDay ?? null,
            shirtSize: params.member.shirtSize || null,
            addressLine1: params.member.addressLine1 || null,
            addressLine2: params.member.addressLine2 || null,
            addressCity: params.member.addressCity || null,
            addressState: params.member.addressState || null,
            addressZip: params.member.addressZip || null,
            vegetarianMeal: params.member.vegetarianMeal ?? null,
            attendedReunion2025: params.member.attendedReunion2025 ?? null,
            tierLabel: pricing.label,
            priceCents: pricing.priceCents,
        })
        .returning({ id: partyMembers.id })

    await db
        .update(registrations)
        .set({ updatedAt: new Date() })
        .where(eq(registrations.id, params.registrationId))

    dbg.register(
        'admin added member %s to registration %s at net %d',
        inserted.id,
        params.registrationId,
        pricing.priceCents,
    )

    return { memberId: inserted.id }
}
