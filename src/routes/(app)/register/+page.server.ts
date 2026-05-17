import { redirect, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { env } from '$env/dynamic/private'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, pricingTiers, registrations, partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import type { PageServerLoad, Actions } from './$types'
import { registrationSchema } from './schema'

function getStripe() {
    return new Stripe(env.STRIPE_SECRET_KEY!)
}

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const openEvents = await db.select().from(reunionEvents).where(eq(reunionEvents.status, 'open'))

    const tiers =
        openEvents.length > 0
            ? await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, openEvents[0].id))
            : []

    const form = await superValidate(zod(registrationSchema))

    return {
        user,
        events: openEvents,
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

        const { eventId, members: membersJson } = form.data

        const members: {
            name: string
            birthYear: number
            birthMonth: number | null
            birthDay: number | null
            tierId: string
        }[] = JSON.parse(membersJson)

        if (members.length === 0) {
            return fail(400, { form })
        }

        dbg.register('user=%s eventId=%s members=%d', user.id, eventId, members.length)

        const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, eventId))

        const tierMap = new Map(tiers.map((t) => [t.id, t]))

        let totalCents = 0
        const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams['line_items']> = []

        for (const member of members) {
            const tier = tierMap.get(member.tierId)
            if (!tier) return fail(400, { form })
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
            .values({
                userId: user.id,
                eventId,
                totalAmountCents: totalCents,
                status: 'pending',
            })
            .returning()

        await db.insert(partyMembers).values(
            members.map((m) => ({
                registrationId: registration.id,
                name: m.name,
                birthYear: m.birthYear,
                birthMonth: m.birthMonth,
                birthDay: m.birthDay,
                pricingTierId: m.tierId,
            })),
        )

        dbg.register('registration created id=%s, creating stripe session', registration.id)

        const session = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${event.url.origin}/register/confirmation?registration_id=${registration.id}`,
            cancel_url: `${event.url.origin}/register`,
            metadata: {
                registrationId: registration.id,
            },
        })

        await db
            .update(registrations)
            .set({ stripeSessionId: session.id })
            .where(eq(registrations.id, registration.id))

        dbg.register('stripe session=%s, redirecting to checkout', session.id)
        throw redirect(303, session.url!)
    },
}
