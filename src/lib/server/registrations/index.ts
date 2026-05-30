import { error } from '@sveltejs/kit'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import {
    registrations,
    partyMembers,
    pricingTiers,
    reunionEvents,
    userProfiles,
    registrationStatusEnum,
} from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import {
    createRegistrationCheckout,
    createAddMemberCheckout,
    refundPaymentIntent,
    retrieveSessionPaymentIntent,
} from '$lib/server/payments'
import { formatPrice } from '$lib/utils'
import { getAge, parseBirthDate } from '$lib/utils/age'

export type MemberInput = {
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
}

async function fetchAndValidateTiers(
    eventId: string,
    tierIds: string[],
): Promise<Map<string, typeof pricingTiers.$inferSelect>> {
    const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, eventId))
    const tierMap = new Map(tiers.map((t) => [t.id, t]))
    for (const id of tierIds) {
        if (!tierMap.has(id)) throw error(400, 'Invalid pricing tier')
    }
    return tierMap
}

export function calculateTotal(
    selfName: string,
    selfTier: { label: string; priceCents: number },
    additionalMembers: MemberInput[],
    tierMap: Map<string, { label: string; priceCents: number }>,
): { totalCents: number; lineItems: Array<{ name: string; priceCents: number }> } {
    const lineItems = [{ name: `${selfName} (${selfTier.label})`, priceCents: selfTier.priceCents }]
    let totalCents = selfTier.priceCents
    for (const m of additionalMembers) {
        const tier = tierMap.get(m.tierId)!
        totalCents += tier.priceCents
        lineItems.push({ name: `${m.name} (${tier.label})`, priceCents: tier.priceCents })
    }
    return { totalCents, lineItems }
}

export async function createPendingRegistration(params: {
    userId: string
    userName: string
    eventId: string
    selfTierId: string
    selfBirthDate?: string
    selfShirtSize?: string
    additionalMembers: MemberInput[]
    successUrl: (registrationId: string) => string
    cancelUrl: (registrationId: string) => string
}): Promise<{ registrationId: string; checkoutUrl: string }> {
    const allTierIds = [params.selfTierId, ...params.additionalMembers.map((m) => m.tierId)]
    const tierMap = await fetchAndValidateTiers(params.eventId, allTierIds)
    const selfTier = tierMap.get(params.selfTierId)!

    if (params.selfBirthDate) {
        const parsed = parseBirthDate(params.selfBirthDate)
        if (parsed) {
            await db
                .insert(userProfiles)
                .values({ userId: params.userId, ...parsed })
                .onConflictDoUpdate({
                    target: userProfiles.userId,
                    set: { ...parsed, updatedAt: new Date() },
                })
        }
    }

    const { totalCents, lineItems } = calculateTotal(
        params.userName,
        selfTier,
        params.additionalMembers,
        tierMap,
    )

    const [registration] = await db
        .insert(registrations)
        .values({
            userId: params.userId,
            eventId: params.eventId,
            totalAmountCents: totalCents,
            status: 'pending',
        })
        .returning()

    const selfParsed = params.selfBirthDate ? parseBirthDate(params.selfBirthDate) : null
    await db.insert(partyMembers).values([
        {
            registrationId: registration.id,
            name: params.userName,
            birthYear: selfParsed?.birthYear ?? null,
            birthMonth: selfParsed?.birthMonth ?? null,
            birthDay: selfParsed?.birthDay ?? null,
            shirtSize: params.selfShirtSize || null,
            pricingTierId: selfTier.id,
        },
        ...params.additionalMembers.map((m) => {
            const parsed = m.birthDate ? parseBirthDate(m.birthDate) : null
            return {
                registrationId: registration.id,
                name: m.name,
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: m.shirtSize || null,
                pricingTierId: m.tierId,
            }
        }),
    ])

    dbg.register('registration created id=%s, creating stripe session', registration.id)

    const { url: checkoutUrl, sessionId } = await createRegistrationCheckout({
        lineItems,
        registrationId: registration.id,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })

    await db
        .update(registrations)
        .set({ stripeSessionId: sessionId })
        .where(eq(registrations.id, registration.id))

    dbg.register('stripe session=%s created', sessionId)
    return { registrationId: registration.id, checkoutUrl }
}

export async function addMember(params: {
    registrationId: string
    userId: string
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
    successUrl: string
    cancelUrl: string
}): Promise<string> {
    const [registration] = await db
        .select()
        .from(registrations)
        .where(
            and(
                eq(registrations.id, params.registrationId),
                eq(registrations.userId, params.userId),
            ),
        )
        .limit(1)
    if (!registration) throw error(404)

    const [tier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, params.tierId))
        .limit(1)
    if (!tier) throw error(400, 'Invalid pricing tier')

    dbg.register('add_member registrationId=%s name=%s', params.registrationId, params.name)

    return createAddMemberCheckout({
        name: params.name,
        tierLabel: tier.label,
        priceCents: tier.priceCents,
        registrationId: params.registrationId,
        memberTierId: params.tierId,
        memberBirthDate: params.birthDate,
        memberShirtSize: params.shirtSize,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })
}

export async function removeMember(memberId: string, userId: string): Promise<void> {
    const [member] = await db
        .select({
            id: partyMembers.id,
            registrationId: partyMembers.registrationId,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
            priceCents: pricingTiers.priceCents,
            registrationUserId: registrations.userId,
            registrationStripeSessionId: registrations.stripeSessionId,
        })
        .from(partyMembers)
        .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, memberId))
        .limit(1)

    if (!member || member.registrationUserId !== userId) throw error(403)

    try {
        let paymentIntentId = member.stripePaymentIntentId
        if (!paymentIntentId && member.registrationStripeSessionId) {
            paymentIntentId = await retrieveSessionPaymentIntent(member.registrationStripeSessionId)
        }
        if (paymentIntentId) {
            await refundPaymentIntent(paymentIntentId, member.priceCents)
            dbg.register(
                'partial refund issued for member=%s amount=%d',
                memberId,
                member.priceCents,
            )
        }
    } catch (err) {
        dbg.register('refund failed for member=%s: %o', memberId, err)
    }

    await db.delete(partyMembers).where(eq(partyMembers.id, memberId))

    const [anyRemaining] = await db
        .select({ id: partyMembers.id })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, member.registrationId))
        .limit(1)

    if (!anyRemaining) {
        await db
            .update(registrations)
            .set({ status: 'refunded', totalAmountCents: 0, updatedAt: new Date() })
            .where(eq(registrations.id, member.registrationId))
        dbg.register('last member removed, registration %s marked refunded', member.registrationId)
    } else {
        await db
            .update(registrations)
            .set({
                totalAmountCents: sql`${registrations.totalAmountCents} - ${member.priceCents}`,
                updatedAt: new Date(),
            })
            .where(eq(registrations.id, member.registrationId))
    }
}

export async function cancelRegistration(registrationId: string, userId: string): Promise<void> {
    const [registration] = await db
        .select()
        .from(registrations)
        .where(and(eq(registrations.id, registrationId), eq(registrations.userId, userId)))
        .limit(1)
    if (!registration) throw error(404)

    const members = await db
        .select({ stripePaymentIntentId: partyMembers.stripePaymentIntentId })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))

    const uniqueIntents = new Set<string>()
    for (const m of members) {
        if (m.stripePaymentIntentId) uniqueIntents.add(m.stripePaymentIntentId)
    }

    if (uniqueIntents.size === 0 && registration.stripeSessionId) {
        try {
            const intentId = await retrieveSessionPaymentIntent(registration.stripeSessionId)
            if (intentId) uniqueIntents.add(intentId)
        } catch (err) {
            dbg.register(
                'could not retrieve payment intent for cancel of registration %s: %o',
                registrationId,
                err,
            )
        }
    }

    await Promise.all(
        Array.from(uniqueIntents).map((intentId) => {
            dbg.register('full refund issued for payment_intent=%s', intentId)
            return refundPaymentIntent(intentId).catch((err) => {
                dbg.register('refund failed for payment_intent=%s: %o', intentId, err)
            })
        }),
    )

    await db
        .update(registrations)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(registrations.id, registrationId))

    dbg.register('registration %s cancelled and refunded', registrationId)
}

export async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
    const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null

    if (session.metadata?.type === 'add_member') {
        const { registrationId, memberName, memberTierId, memberBirthDate, memberShirtSize } =
            session.metadata
        const memberPriceCents = parseInt(session.metadata.memberPriceCents ?? '0', 10)

        dbg.stripe('add_member registrationId=%s member=%s', registrationId, memberName)

        await db.transaction(async (tx) => {
            const parsed = memberBirthDate ? parseBirthDate(memberBirthDate) : null
            await tx.insert(partyMembers).values({
                registrationId,
                name: memberName,
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: memberShirtSize || null,
                pricingTierId: memberTierId,
                stripePaymentIntentId: paymentIntentId,
            })
            await tx
                .update(registrations)
                .set({
                    totalAmountCents: sql`${registrations.totalAmountCents} + ${memberPriceCents}`,
                    updatedAt: new Date(),
                })
                .where(eq(registrations.id, registrationId))
        })
        return
    }

    const registrationId = session.metadata?.registrationId
    if (!registrationId) {
        dbg.stripe('checkout.session.completed but no registrationId in metadata')
        return
    }

    dbg.stripe('checkout.session.completed registrationId=%s', registrationId)

    await db.transaction(async (tx) => {
        await tx
            .update(registrations)
            .set({ status: 'paid', updatedAt: new Date() })
            .where(eq(registrations.id, registrationId))

        if (paymentIntentId) {
            await tx
                .update(partyMembers)
                .set({ stripePaymentIntentId: paymentIntentId })
                .where(eq(partyMembers.registrationId, registrationId))
            dbg.stripe(
                'backfilled payment_intent on party members for registration %s',
                registrationId,
            )
        }
    })

    // Email outside the transaction — a transient email failure should not roll back payment
    const [registration] = await db
        .select({
            eventId: registrations.eventId,
            totalAmountCents: registrations.totalAmountCents,
        })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    if (!registration) return

    const [[reunionEvent], members] = await Promise.all([
        db.select().from(reunionEvents).where(eq(reunionEvents.id, registration.eventId)),
        db.select().from(partyMembers).where(eq(partyMembers.registrationId, registrationId)),
    ])
    if (!reunionEvent) return

    dbg.stripe('sending confirmation email for registration %s', registrationId)
    try {
        await sendRegistrationConfirmation(
            session.customer_details?.email ?? session.customer_email ?? '',
            {
                name: session.customer_details?.name ?? 'Family Member',
                eventTitle: reunionEvent.title,
                partyMembers: members.map((m) => {
                    const extras: string[] = []
                    if (m.birthYear)
                        extras.push(`age ${getAge(m.birthYear, m.birthMonth, m.birthDay)}`)
                    if (m.shirtSize) extras.push(`shirt ${m.shirtSize}`)
                    return extras.length > 0 ? `${m.name} (${extras.join(', ')})` : m.name
                }),
                totalAmount: `$${formatPrice(registration.totalAmountCents)}`,
            },
        )
    } catch (err) {
        dbg.stripe('confirmation email failed for registration %s: %o', registrationId, err)
    }
}

export async function createAdminRegistration(params: {
    eventId: string
    contactName: string
    contactEmail: string | null
    status: (typeof registrationStatusEnum.enumValues)[number]
    members: Array<{ name: string; birthDate?: string; tierId: string; shirtSize?: string }>
}): Promise<{ registrationId: string }> {
    const tierMap = await fetchAndValidateTiers(
        params.eventId,
        params.members.map((m) => m.tierId),
    )

    const totalAmountCents = params.members.reduce(
        (sum, m) => sum + (tierMap.get(m.tierId)?.priceCents ?? 0),
        0,
    )

    const [registration] = await db
        .insert(registrations)
        .values({
            eventId: params.eventId,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            totalAmountCents,
            status: params.status,
        })
        .returning()

    await db.insert(partyMembers).values(
        params.members.map((m) => {
            const parsed = m.birthDate ? parseBirthDate(m.birthDate) : null
            return {
                registrationId: registration.id,
                name: m.name.trim(),
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: m.shirtSize || null,
                pricingTierId: m.tierId,
            }
        }),
    )

    return { registrationId: registration.id }
}

export async function deleteOwnPendingRegistrations(
    userId: string,
    eventId: string,
): Promise<void> {
    const pendingIds = db
        .select({ id: registrations.id })
        .from(registrations)
        .where(
            and(
                eq(registrations.userId, userId),
                eq(registrations.eventId, eventId),
                eq(registrations.status, 'pending'),
            ),
        )

    await db.delete(partyMembers).where(inArray(partyMembers.registrationId, pendingIds))
    await db
        .delete(registrations)
        .where(
            and(
                eq(registrations.userId, userId),
                eq(registrations.eventId, eventId),
                eq(registrations.status, 'pending'),
            ),
        )
}
