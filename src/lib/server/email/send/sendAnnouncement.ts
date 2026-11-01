import { dbg } from '$lib/server/debug'
import { renderAnnouncement, type AnnouncementEmailData } from '../templates'
import { BATCH_SIZE_LIMIT, sendBatch } from './_resend'

/* Sends one announcement to every recipient, BATCH_SIZE_LIMIT at a time.

   Each batch is keyed `announcement/<id>/<index>`, and batches before alreadySent are skipped, so a
   retry picks up where a failure stopped: Resend dedupes a repeated key within 24 hours, and the
   skip covers a retry after that. onProgress is called with the running total after each batch so
   the caller can record how far it got before throwing. */
export async function sendAnnouncement(params: {
    announcementId: string
    recipients: string[]
    data: AnnouncementEmailData
    alreadySent: number
    onProgress: (sentCount: number) => Promise<void>
}): Promise<void> {
    const rendered = renderAnnouncement(params.data)
    const firstBatch = Math.floor(params.alreadySent / BATCH_SIZE_LIMIT)
    const batchCount = Math.ceil(params.recipients.length / BATCH_SIZE_LIMIT)

    for (let index = firstBatch; index < batchCount; index++) {
        const batch = params.recipients.slice(
            index * BATCH_SIZE_LIMIT,
            (index + 1) * BATCH_SIZE_LIMIT,
        )
        dbg.email('sendAnnouncement %s batch %d (%d)', params.announcementId, index, batch.length)
        await sendBatch(
            batch.map((to) => ({ to, ...rendered })),
            `announcement/${params.announcementId}/${index}`,
        )
        await params.onProgress(Math.min((index + 1) * BATCH_SIZE_LIMIT, params.recipients.length))
    }
}
