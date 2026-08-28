import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers } from '$lib/server/db/schema'
import type { RegistrationMember } from './RegistrationMember'

/* Returns party members for a registration; tier label and price are stored directly on the row, so no join is needed. */
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
            addressLine1: partyMembers.addressLine1,
            addressLine2: partyMembers.addressLine2,
            addressCity: partyMembers.addressCity,
            addressState: partyMembers.addressState,
            addressZip: partyMembers.addressZip,
            vegetarianMeal: partyMembers.vegetarianMeal,
            attendedReunion2025: partyMembers.attendedReunion2025,
            tierLabel: partyMembers.tierLabel,
            priceCents: partyMembers.priceCents,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
            stripeCheckoutSessionId: partyMembers.stripeCheckoutSessionId,
        })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))
}
