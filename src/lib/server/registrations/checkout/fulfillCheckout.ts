import { eq, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { decodeSessionMetadata } from '$lib/server/payments'
import { formatPrice } from '$lib/utils'
import { getAge, parseBirthDate } from '$lib/utils/age'

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
