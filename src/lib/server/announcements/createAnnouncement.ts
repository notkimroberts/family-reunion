import { resolveActorUserId } from '$lib/server/auth/resolveActorUserId'
import { db } from '$lib/server/db'
import { announcements } from '$lib/server/db/schema'
import type { AnnouncementAudience } from './getAnnouncementRecipients'

// Records an announcement as `sending`, with its recipient list fixed, and returns its id
export async function createAnnouncement(params: {
    eventId: string
    subject: string
    body: string
    audience: AnnouncementAudience
    recipients: string[]
    sender: { id: string; name: string }
}): Promise<string> {
    const [row] = await db
        .insert(announcements)
        .values({
            eventId: params.eventId,
            subject: params.subject,
            body: params.body,
            audience: params.audience,
            recipients: params.recipients,
            sentByUserId: await resolveActorUserId(params.sender.id),
            sentByName: params.sender.name,
        })
        .returning({ id: announcements.id })
    return row.id
}
