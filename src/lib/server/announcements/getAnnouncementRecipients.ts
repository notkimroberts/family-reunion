import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { announcementAudienceEnum, registrations } from '$lib/server/db/schema'

export type AnnouncementAudience = (typeof announcementAudienceEnum.enumValues)[number]

const STATUSES_BY_AUDIENCE = {
    confirmed: ['paid', 'waived'],
    everyone_active: ['paid', 'waived', 'pending'],
} as const satisfies Record<AnnouncementAudience, string[]>

/* The contact addresses an announcement reaches: one per address however many bookings share it,
   compared without case, and sorted so the same list always splits into the same batches. */
export async function getAnnouncementRecipients(
    eventId: string,
    audience: AnnouncementAudience,
): Promise<string[]> {
    const rows = await db
        .select({ email: registrations.contactEmail })
        .from(registrations)
        .where(
            and(
                eq(registrations.eventId, eventId),
                inArray(registrations.status, [...STATUSES_BY_AUDIENCE[audience]]),
            ),
        )

    return [...new Set(rows.map((row) => row.email.trim().toLowerCase()))].toSorted()
}
