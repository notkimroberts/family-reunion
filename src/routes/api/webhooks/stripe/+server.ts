import { eq, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { env } from '$env/dynamic/private'
import { db } from '$lib/server/db'
import { registrations, reunionEvents, partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { getStripe } from '$lib/server/stripe'
import { formatPrice } from '$lib/utils'
import { getAgeFromDate } from '$lib/utils/age'
import type { RequestHandler } from './$types'

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
        const paymentIntentId =
            typeof session.payment_intent === 'string' ? session.payment_intent : null

        if (session.metadata?.type === 'add_member') {
            const { registrationId, memberName, memberTierId, memberBirthDate, memberShirtSize } =
                session.metadata
            const memberPriceCents = parseInt(session.metadata.memberPriceCents ?? '0', 10)

            dbg.stripe('add_member registrationId=%s member=%s', registrationId, memberName)

            await db.insert(partyMembers).values({
                registrationId,
                name: memberName,
                birthDate: memberBirthDate || null,
                shirtSize: memberShirtSize || null,
                pricingTierId: memberTierId,
                stripePaymentIntentId: paymentIntentId,
            })

            await db
                .update(registrations)
                .set({
                    totalAmountCents: sql`${registrations.totalAmountCents} + ${memberPriceCents}`,
                    updatedAt: new Date(),
                })
                .where(eq(registrations.id, registrationId))
        } else {
            const registrationId = session.metadata?.registrationId

            if (registrationId) {
                dbg.stripe('checkout.session.completed registrationId=%s', registrationId)

                await db
                    .update(registrations)
                    .set({ status: 'paid', updatedAt: new Date() })
                    .where(eq(registrations.id, registrationId))

                dbg.stripe('registration %s marked as paid', registrationId)

                if (paymentIntentId) {
                    await db
                        .update(partyMembers)
                        .set({ stripePaymentIntentId: paymentIntentId })
                        .where(eq(partyMembers.registrationId, registrationId))
                    dbg.stripe(
                        'backfilled payment_intent on party members for registration %s',
                        registrationId,
                    )
                }

                const [registration] = await db
                    .select({
                        eventId: registrations.eventId,
                        totalAmountCents: registrations.totalAmountCents,
                    })
                    .from(registrations)
                    .where(eq(registrations.id, registrationId))

                if (registration) {
                    const [[reunionEvent], members] = await Promise.all([
                        db
                            .select()
                            .from(reunionEvents)
                            .where(eq(reunionEvents.id, registration.eventId)),
                        db
                            .select()
                            .from(partyMembers)
                            .where(eq(partyMembers.registrationId, registrationId)),
                    ])

                    if (reunionEvent) {
                        dbg.stripe('sending confirmation email for registration %s', registrationId)
                        try {
                            await sendRegistrationConfirmation(
                                session.customer_details?.email ?? session.customer_email ?? '',
                                {
                                    name: session.customer_details?.name ?? 'Family Member',
                                    eventTitle: reunionEvent.title,
                                    partyMembers: members.map((m) => {
                                        const parts = [m.name]
                                        if (m.birthDate)
                                            parts.push(`age ${getAgeFromDate(m.birthDate)}`)
                                        if (m.shirtSize) parts.push(`shirt ${m.shirtSize}`)
                                        return parts.length > 1
                                            ? `${m.name} (${parts.slice(1).join(', ')})`
                                            : m.name
                                    }),
                                    totalAmount: `$${formatPrice(registration.totalAmountCents)}`,
                                },
                            )
                        } catch (err) {
                            dbg.stripe(
                                'confirmation email failed for registration %s: %o',
                                registrationId,
                                err,
                            )
                        }
                    }
                }
            } else {
                dbg.stripe('checkout.session.completed but no registrationId in metadata')
            }
        }
    }

    return new Response('OK', { status: 200 })
}
