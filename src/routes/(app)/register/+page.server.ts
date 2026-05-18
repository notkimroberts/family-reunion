import { redirect, fail } from '@sveltejs/kit'
import { eq, desc } from 'drizzle-orm'
import Stripe from 'stripe'
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
import type { PageServerLoad, Actions } from './$types'
import { registrationSchema } from './schema'

function getStripe() {
    return new Stripe(env.STRIPE_SECRET_KEY!)
}

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

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

    const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)

    const form = await superValidate({ eventId: openEvent?.id ?? '' }, zod(registrationSchema))

    return {
        user,
        profile: profile ?? null,
        event: openEvent,
        tiers,
        form,
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

        const session = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${event.url.origin}/register/confirmation?registration_id=${registration.id}`,
            cancel_url: `${event.url.origin}/register`,
            metadata: { registrationId: registration.id },
        })

        await db
            .update(registrations)
            .set({ stripeSessionId: session.id })
            .where(eq(registrations.id, registration.id))

        dbg.register('stripe session=%s, redirecting to checkout', session.id)
        throw redirect(303, session.url!)
    },
}
