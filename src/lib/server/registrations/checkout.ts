import { error } from '@sveltejs/kit'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import {
    partyMembers,
    pricingTiers,
    registrations,
    registrationStatusEnum,
    reunionEvents,
    userProfiles,
} from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import {
    createAddMemberCheckout,
    createRegistrationCheckout,
    decodeSessionMetadata,
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
        if (!tierMap.has(id)) {
            throw error(400, 'Invalid pricing tier')
        }
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
    if (!registration) {
        throw error(404)
    }

    const [tier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, params.tierId))
        .limit(1)
    if (!tier) {
        throw error(400, 'Invalid pricing tier')
    }

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

export async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
    const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null

    const metadata = decodeSessionMetadata(session.metadata)
    if (!metadata) {
        dbg.stripe('checkout.session.completed but no registrationId in metadata')
        return
    }

    if (metadata.type === 'add_member') {
        const { registrationId, memberName, memberTierId, memberBirthDate, memberShirtSize } =
            metadata
        const memberPriceCents = parseInt(metadata.memberPriceCents, 10)

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

    const { registrationId } = metadata

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
    if (!registration) {
        return
    }

    const [[reunionEvent], members] = await Promise.all([
        db.select().from(reunionEvents).where(eq(reunionEvents.id, registration.eventId)),
        db.select().from(partyMembers).where(eq(partyMembers.registrationId, registrationId)),
    ])
    if (!reunionEvent) {
        return
    }

    dbg.stripe('sending confirmation email for registration %s', registrationId)
    try {
        await sendRegistrationConfirmation(
            session.customer_details?.email ?? session.customer_email ?? '',
            {
                name: session.customer_details?.name ?? 'Family Member',
                eventTitle: reunionEvent.title,
                partyMembers: members.map((m) => {
                    const extras: string[] = []
                    if (m.birthYear) {
                        extras.push(`age ${getAge(m.birthYear, m.birthMonth, m.birthDay)}`)
                    }
                    if (m.shirtSize) {
                        extras.push(`shirt ${m.shirtSize}`)
                    }
                    return extras.length > 0 ? `${m.name} (${extras.join(', ')})` : m.name
                }),
                totalAmount: `$${formatPrice(registration.totalAmountCents)}`,
            },
        )
    } catch (err) {
        dbg.stripe('confirmation email failed for registration %s: %o', registrationId, err)
    }
}
