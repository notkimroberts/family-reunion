import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { announcements } from '$lib/server/db/schema'
import { sendAnnouncement } from '$lib/server/email'
import { reportError } from '$lib/server/reportError'

/* Sends a recorded announcement from wherever it stopped, recording progress after every batch and
   the outcome at the end. Returns how many recipients it reached and whether it finished; it never
   throws, because the caller's job is to tell the owner how far it got.

   A retry claims the row with a conditional UPDATE from `failed` to `sending`, so two presses of
   Retry cannot run the same batches side by side; a first send is delivered by the request that
   created the row, the only one holding its id. */
export async function deliverAnnouncement(params: {
    announcementId: string
    /* The reunion in the URL. A row from another year matches nothing. */
    eventId: string
    eventTitle: string
    siteOrigin: string
    retry: boolean
}): Promise<{ sentCount: number; total: number; finished: boolean } | undefined> {
    const [announcement] = await db
        .update(announcements)
        .set({ status: 'sending' })
        .where(
            and(
                eq(announcements.id, params.announcementId),
                eq(announcements.eventId, params.eventId),
                eq(announcements.status, params.retry ? 'failed' : 'sending'),
            ),
        )
        .returning()
    if (!announcement) {
        return undefined
    }

    let sentCount = announcement.sentCount
    try {
        await sendAnnouncement({
            announcementId: announcement.id,
            recipients: announcement.recipients,
            data: {
                eventTitle: params.eventTitle,
                subject: announcement.subject,
                body: announcement.body,
                siteOrigin: params.siteOrigin,
            },
            alreadySent: sentCount,
            onProgress: async (count) => {
                sentCount = count
                await db
                    .update(announcements)
                    .set({ sentCount: count })
                    .where(eq(announcements.id, announcement.id))
            },
        })
    } catch (err) {
        reportError('announcement send failed', err, {
            announcementId: announcement.id,
            sentCount,
        })
        await db
            .update(announcements)
            .set({ status: 'failed' })
            .where(eq(announcements.id, announcement.id))
        return { sentCount, total: announcement.recipients.length, finished: false }
    }

    await db
        .update(announcements)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(announcements.id, announcement.id))
    return { sentCount, total: announcement.recipients.length, finished: true }
}
