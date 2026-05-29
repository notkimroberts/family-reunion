import { redirect, fail, error } from '@sveltejs/kit'
import { eq, desc, and, inArray } from 'drizzle-orm'
import type Stripe from 'stripe'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { env } from '$env/dynamic/private'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import {
    reunionEvents,
    pricingTiers,
    registrations,
    partyMembers,
    userProfiles,
} from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { getStripe } from '$lib/server/stripe'
import type { PageServerLoad, Actions } from './$types'
import {
    registrationSchema,
    addMemberSchema,
    updateMemberSchema,
    removeMemberSchema,
    cancelRegistrationSchema,
} from './schema'

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const memberAdded = event.url.searchParams.get('member_added') === 'true'

    const openEvents = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .orderBy(desc(reunionEvents.year))
        .limit(1)

    const openEvent = openEvents[0] ?? null

    const tiers = openEvent
        ? await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, openEvent.id))
        : []

    if (openEvent) {
        // Auto-clean any pending registrations for this event
        const pendingRegs = await db
            .select({ id: registrations.id })
            .from(registrations)
            .where(
                and(
                    eq(registrations.userId, user.id),
                    eq(registrations.eventId, openEvent.id),
                    eq(registrations.status, 'pending'),
                ),
            )

        if (pendingRegs.length > 0) {
            const pendingIds = pendingRegs.map((r) => r.id)
            await db.delete(partyMembers).where(inArray(partyMembers.registrationId, pendingIds))
            await db.delete(registrations).where(inArray(registrations.id, pendingIds))
            dbg.register(
                'auto-deleted %d pending registrations for user=%s',
                pendingIds.length,
                user.id,
            )
        }

        // Check for existing paid/waived registration
        const [existingReg] = await db
            .select()
            .from(registrations)
            .where(
                and(
                    eq(registrations.userId, user.id),
                    eq(registrations.eventId, openEvent.id),
                    inArray(registrations.status, ['paid', 'waived']),
                ),
            )
            .limit(1)

        if (existingReg) {
            const members = await db
                .select({
                    id: partyMembers.id,
                    name: partyMembers.name,
                    birthDate: partyMembers.birthDate,
                    shirtSize: partyMembers.shirtSize,
                    pricingTierId: partyMembers.pricingTierId,
                    stripePaymentIntentId: partyMembers.stripePaymentIntentId,
                    tierLabel: pricingTiers.label,
                    priceCents: pricingTiers.priceCents,
                })
                .from(partyMembers)
                .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
                .where(eq(partyMembers.registrationId, existingReg.id))

            const form = await superValidate({ eventId: openEvent.id }, zod(registrationSchema))

            return {
                user,
                existingRegistration: existingReg,
                members,
                tiers,
                event: openEvent,
                memberAdded,
                form,
                profile: null,
            }
        }
    }

    const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)

    const form = await superValidate({ eventId: openEvent?.id ?? '' }, zod(registrationSchema))

    return {
        user,
        existingRegistration: null,
        members: [],
        tiers,
        event: openEvent,
        memberAdded: false,
        form,
        profile: profile ?? null,
    }
}

export const actions: Actions = {
    default: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(registrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const {
            eventId,
            selfTierId,
            selfBirthDate,
            selfShirtSize,
            members: membersJson,
        } = form.data

        type MemberInput = { name: string; tierId: string; birthDate?: string; shirtSize?: string }
        const additionalMembers: MemberInput[] = JSON.parse(membersJson)

        const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, eventId))
        const tierMap = new Map(tiers.map((t) => [t.id, t]))

        const selfTier = tierMap.get(selfTierId)
        if (!selfTier) {
            return fail(400, { form })
        }

        for (const m of additionalMembers) {
            if (!tierMap.has(m.tierId)) return fail(400, { form })
        }

        dbg.register(
            'user=%s eventId=%s members=%d',
            user.id,
            eventId,
            additionalMembers.length + 1,
        )

        if (selfBirthDate) {
            const [existingProfile] = await db
                .select()
                .from(userProfiles)
                .where(eq(userProfiles.userId, user.id))
                .limit(1)

            if (existingProfile) {
                await db
                    .update(userProfiles)
                    .set({ birthDate: selfBirthDate, updatedAt: new Date() })
                    .where(eq(userProfiles.userId, user.id))
            } else {
                await db.insert(userProfiles).values({ userId: user.id, birthDate: selfBirthDate })
            }
        }

        let totalCents = selfTier.priceCents
        const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams['line_items']> = [
            {
                price_data: {
                    currency: 'usd',
                    product_data: { name: `${user.name} (${selfTier.label})` },
                    unit_amount: selfTier.priceCents,
                },
                quantity: 1,
            },
        ]

        for (const member of additionalMembers) {
            const tier = tierMap.get(member.tierId)!
            totalCents += tier.priceCents
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: { name: `${member.name} (${tier.label})` },
                    unit_amount: tier.priceCents,
                },
                quantity: 1,
            })
        }

        dbg.register('total=%d cents', totalCents)

        const [registration] = await db
            .insert(registrations)
            .values({ userId: user.id, eventId, totalAmountCents: totalCents, status: 'pending' })
            .returning()

        await db.insert(partyMembers).values([
            {
                registrationId: registration.id,
                name: user.name,
                birthDate: selfBirthDate || null,
                shirtSize: selfShirtSize || null,
                pricingTierId: selfTier.id,
            },
            ...additionalMembers.map((m) => ({
                registrationId: registration.id,
                name: m.name,
                birthDate: m.birthDate || null,
                shirtSize: m.shirtSize || null,
                pricingTierId: m.tierId,
            })),
        ])

        dbg.register('registration created id=%s, creating stripe session', registration.id)
        dbg.register('stripe key prefix=%s', env.STRIPE_SECRET_KEY?.slice(0, 12))

        let session: Stripe.Checkout.Session
        try {
            session = await getStripe().checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                success_url: `${event.url.origin}/register/confirmation?registration_id=${registration.id}`,
                cancel_url: `${event.url.origin}/register?cancelled=true&registration_id=${registration.id}`,
                metadata: { registrationId: registration.id },
            })
        } catch (err) {
            const detail =
                err && typeof err === 'object' && 'detail' in err
                    ? (err as { detail: unknown }).detail
                    : err
            console.error('[stripe] session create failed:', err)
            console.error('[stripe] underlying cause:', detail)
            throw err
        }

        await db
            .update(registrations)
            .set({ stripeSessionId: session.id })
            .where(eq(registrations.id, registration.id))

        dbg.register('stripe session=%s, redirecting to checkout', session.id)
        throw redirect(303, session.url!)
    },

    add_member: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(addMemberSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { registrationId, name, tierId, birthDate, shirtSize } = form.data

        const [registration] = await db
            .select()
            .from(registrations)
            .where(and(eq(registrations.id, registrationId), eq(registrations.userId, user.id)))
            .limit(1)

        if (!registration) {
            throw error(404)
        }

        const [tier] = await db
            .select()
            .from(pricingTiers)
            .where(eq(pricingTiers.id, tierId))
            .limit(1)
        if (!tier) {
            return fail(400, { form })
        }

        dbg.register('add_member registrationId=%s name=%s tierId=%s', registrationId, name, tierId)

        const session = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: `${name} (${tier.label})` },
                        unit_amount: tier.priceCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${event.url.origin}/register?member_added=true`,
            cancel_url: `${event.url.origin}/register`,
            metadata: {
                type: 'add_member',
                registrationId,
                memberName: name,
                memberTierId: tierId,
                memberBirthDate: birthDate ?? '',
                memberShirtSize: shirtSize ?? '',
                memberPriceCents: String(tier.priceCents),
            },
        })

        throw redirect(303, session.url!)
    },

    update_member: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(updateMemberSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { memberId, birthDate, shirtSize } = form.data

        const [member] = await db
            .select({
                id: partyMembers.id,
                registrationUserId: registrations.userId,
            })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            .where(eq(partyMembers.id, memberId))
            .limit(1)

        if (!member || member.registrationUserId !== user.id) {
            throw error(403)
        }

        await db
            .update(partyMembers)
            .set({
                birthDate: birthDate || null,
                shirtSize: shirtSize || null,
            })
            .where(eq(partyMembers.id, memberId))

        dbg.register('update_member memberId=%s', memberId)
        return { success: true }
    },

    remove_member: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(removeMemberSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { memberId } = form.data

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

        if (!member || member.registrationUserId !== user.id) {
            throw error(403)
        }

        let paymentIntentId = member.stripePaymentIntentId
        if (!paymentIntentId && member.registrationStripeSessionId) {
            const session = await getStripe().checkout.sessions.retrieve(
                member.registrationStripeSessionId,
            )
            paymentIntentId =
                typeof session.payment_intent === 'string' ? session.payment_intent : null
        }

        if (paymentIntentId) {
            await getStripe().refunds.create({
                payment_intent: paymentIntentId,
                amount: member.priceCents,
            })
            dbg.register(
                'partial refund issued for member=%s amount=%d',
                memberId,
                member.priceCents,
            )
        }

        await db.delete(partyMembers).where(eq(partyMembers.id, memberId))

        const remainingWithTiers = await db
            .select({ priceCents: pricingTiers.priceCents })
            .from(partyMembers)
            .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
            .where(eq(partyMembers.registrationId, member.registrationId))

        if (remainingWithTiers.length === 0) {
            await db
                .update(registrations)
                .set({ status: 'refunded', totalAmountCents: 0, updatedAt: new Date() })
                .where(eq(registrations.id, member.registrationId))
            dbg.register(
                'last member removed, registration %s marked refunded',
                member.registrationId,
            )
        } else {
            const newTotal = remainingWithTiers.reduce((sum, m) => sum + m.priceCents, 0)
            await db
                .update(registrations)
                .set({ totalAmountCents: newTotal, updatedAt: new Date() })
                .where(eq(registrations.id, member.registrationId))
        }

        return { success: true }
    },

    cancel: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(cancelRegistrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { registrationId } = form.data

        const [registration] = await db
            .select()
            .from(registrations)
            .where(and(eq(registrations.id, registrationId), eq(registrations.userId, user.id)))
            .limit(1)

        if (!registration) {
            throw error(404)
        }

        const members = await db
            .select({ stripePaymentIntentId: partyMembers.stripePaymentIntentId })
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, registrationId))

        const uniqueIntents = new Set<string>()
        for (const m of members) {
            if (m.stripePaymentIntentId) {
                uniqueIntents.add(m.stripePaymentIntentId)
            }
        }

        if (uniqueIntents.size === 0 && registration.stripeSessionId) {
            const session = await getStripe().checkout.sessions.retrieve(
                registration.stripeSessionId,
            )
            if (typeof session.payment_intent === 'string') {
                uniqueIntents.add(session.payment_intent)
            }
        }

        await Promise.all(
            Array.from(uniqueIntents).map((intentId) => {
                dbg.register('full refund issued for payment_intent=%s', intentId)
                return getStripe().refunds.create({ payment_intent: intentId })
            }),
        )

        await db
            .update(registrations)
            .set({ status: 'refunded', updatedAt: new Date() })
            .where(eq(registrations.id, registrationId))

        dbg.register('registration %s cancelled and refunded', registrationId)
        return { success: true }
    },
}
