import { inArray, like, or } from 'drizzle-orm'
import type { ReunionDb } from '$lib/server/db/ReunionDb'
import { donations, registrations } from '$lib/server/db/schema'

/* Stripe prefixes every test-mode Checkout Session id with this. A live session starts `cs_live_`,
   and a paper entry has no session at all, so neither can match. */
const TEST_SESSION_PREFIX = 'cs_test_'

export type TestRegistrationPurge = {
    registrations: { id: string; contactName: string; contactEmail: string; status: string }[]
    donations: { id: string; donorName: string; amountCents: number; status: string }[]
    deleted: boolean
}

/* Finds — and, with `confirm`, deletes — every booking and gift paid through Stripe TEST mode, so
   the preview's practice registrations do not reach the admin totals or the public "already
   registered" count once registration opens.

   Identified by the Checkout Session id rather than a flag column: Stripe writes the mode into the
   id itself, so a real booking cannot be caught. A gift given WITH a test booking is found through
   its registration_id as well, since deleting the booking alone would leave it behind (that FK is
   `on delete set null`). Party members and audit rows go with the booking (`on delete cascade`).

   Not caught, on purpose: a test-mode `add_member` checkout on an otherwise real booking, and a
   pending row whose Stripe session was never created. Neither comes from the preview flow.

   The database is a parameter for the reason resetPassword's is: admin:purge-test-registrations is
   a standalone script with no $env/dynamic/private. */
export async function purgeTestRegistrations(
    db: ReunionDb,
    { confirm }: { confirm: boolean },
): Promise<TestRegistrationPurge> {
    return db.transaction(async (tx) => {
        const foundRegistrations = await tx
            .select({
                id: registrations.id,
                contactName: registrations.contactName,
                contactEmail: registrations.contactEmail,
                status: registrations.status,
            })
            .from(registrations)
            .where(like(registrations.stripeSessionId, `${TEST_SESSION_PREFIX}%`))
        const registrationIds = foundRegistrations.map((registration) => registration.id)

        const testGift = like(donations.stripeSessionId, `${TEST_SESSION_PREFIX}%`)
        const foundDonations = await tx
            .select({
                id: donations.id,
                donorName: donations.donorName,
                amountCents: donations.amountCents,
                status: donations.status,
            })
            .from(donations)
            .where(
                registrationIds.length > 0
                    ? or(testGift, inArray(donations.registrationId, registrationIds))
                    : testGift,
            )

        if (confirm) {
            if (foundDonations.length > 0) {
                await tx.delete(donations).where(
                    inArray(
                        donations.id,
                        foundDonations.map((donation) => donation.id),
                    ),
                )
            }
            if (registrationIds.length > 0) {
                await tx.delete(registrations).where(inArray(registrations.id, registrationIds))
            }
        }

        return { registrations: foundRegistrations, donations: foundDonations, deleted: confirm }
    })
}
