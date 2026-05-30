import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import {
    partyMembers,
    pricingTiers,
    registrations,
    registrationStatusEnum,
    reunionEvents,
} from '$lib/server/db/schema'

export type RegistrationMember = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    shirtSize: string | null
    pricingTierId: string
    stripePaymentIntentId: string | null
    tierLabel: string
    priceCents: number
}

export async function getOpenEvent(): Promise<typeof reunionEvents.$inferSelect | undefined> {
    const [event] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .orderBy(desc(reunionEvents.year))
        .limit(1)
    return event
}

export async function getEventTiers(
    eventId: string,
): Promise<(typeof pricingTiers.$inferSelect)[]> {
    return db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.eventId, eventId))
        .orderBy(pricingTiers.minAge)
}

export async function getRegistration(
    userId: string,
    eventId: string,
    statuses: Array<(typeof registrationStatusEnum.enumValues)[number]>,
): Promise<typeof registrations.$inferSelect | undefined> {
    const [registration] = await db
        .select()
        .from(registrations)
        .where(
            and(
                eq(registrations.userId, userId),
                eq(registrations.eventId, eventId),
                inArray(registrations.status, statuses),
            ),
        )
        .limit(1)
    return registration
}

export async function getRegistrationWithEvent(registrationId: string): Promise<
    | {
          registration: typeof registrations.$inferSelect
          event: typeof reunionEvents.$inferSelect
      }
    | undefined
> {
    const [result] = await db
        .select({ registration: registrations, event: reunionEvents })
        .from(registrations)
        .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
        .where(eq(registrations.id, registrationId))
        .limit(1)
    return result
}

export async function getRegistrationMembers(
    registrationId: string,
): Promise<RegistrationMember[]> {
    return db
        .select({
            id: partyMembers.id,
            name: partyMembers.name,
            birthYear: partyMembers.birthYear,
            birthMonth: partyMembers.birthMonth,
            birthDay: partyMembers.birthDay,
            shirtSize: partyMembers.shirtSize,
            pricingTierId: partyMembers.pricingTierId,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
            tierLabel: pricingTiers.label,
            priceCents: pricingTiers.priceCents,
        })
        .from(partyMembers)
        .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
        .where(eq(partyMembers.registrationId, registrationId))
}

export async function getRegistrationStatus(
    registrationId: string,
    userId: string,
): Promise<(typeof registrationStatusEnum.enumValues)[number] | null> {
    const [registration] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(and(eq(registrations.id, registrationId), eq(registrations.userId, userId)))
        .limit(1)
    return registration?.status ?? null
}
