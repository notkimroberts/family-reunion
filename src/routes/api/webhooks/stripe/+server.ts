import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { env } from '$env/dynamic/private'
import { db } from '$lib/server/db'
import { registrations, reunionEvents, partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { getAgeFromDate } from '$lib/utils/age'
import type { RequestHandler } from './$types'

function getStripe() {
    return new Stripe(env.STRIPE_SECRET_KEY!)
}

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
        dbg.stripe('webhook rejected: missing signature')
        return new Response('Missing signature', { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET!)
    } catch {
        dbg.stripe('webhook rejected: invalid signature')
        return new Response('Invalid signature', { status: 400 })
    }

    dbg.stripe('webhook event type=%s', event.type)

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const registrationId = session.metadata?.registrationId

        if (registrationId) {
            dbg.stripe('checkout.session.completed registrationId=%s', registrationId)

            await db
                .update(registrations)
                .set({ status: 'paid', updatedAt: new Date() })
                .where(eq(registrations.id, registrationId))

            dbg.stripe('registration %s marked as paid', registrationId)

            const [registration] = await db
                .select()
                .from(registrations)
                .where(eq(registrations.id, registrationId))

            if (registration) {
                const [reunionEvent] = await db
                    .select()
                    .from(reunionEvents)
                    .where(eq(reunionEvents.id, registration.eventId))
                const members = await db
                    .select()
                    .from(partyMembers)
                    .where(eq(partyMembers.registrationId, registrationId))

                if (reunionEvent) {
                    dbg.stripe('sending confirmation email for registration %s', registrationId)
                    await sendRegistrationConfirmation(session.customer_email ?? '', {
                        name: session.customer_details?.name ?? 'Family Member',
                        eventTitle: reunionEvent.title,
                        partyMembers: members.map(
                            (m) => `${m.name} (age ${getAgeFromDate(m.birthDate)})`,
                        ),
                        totalAmount: `$${(registration.totalAmountCents / 100).toFixed(2)}`,
                    })
                }
            }
        } else {
            dbg.stripe('checkout.session.completed but no registrationId in metadata')
        }
    }

    return new Response('OK', { status: 200 })
}
