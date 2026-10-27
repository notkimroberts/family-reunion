import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type OutboxMessage = {
    from: string
    replyTo: string
    to: string
    subject: string
    text: string
    html?: string
    idempotencyKey?: string
}

/* Writes one email to EMAIL_OUTBOX_DIR as a JSON file instead of sending it, for the end-to-end
   tests (e2e/), which read the files back to check what each registrant was told.

   Refuses on Railway: a production container with the variable set would report every email as sent
   while delivering none — the silent skip send() exists to prevent. Every attempt is written,
   including a repeated idempotency key, so a test can see a send the app should not have made. */
export async function writeToOutbox(
    dir: string,
    message: OutboxMessage,
    railwayEnvironment: string | undefined,
): Promise<void> {
    if (railwayEnvironment) {
        throw new Error('EMAIL_OUTBOX_DIR is set on Railway — refusing to write emails to disk')
    }
    await mkdir(dir, { recursive: true })
    const sentAt = new Date().toISOString()
    await writeFile(
        join(dir, `${sentAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`),
        JSON.stringify({ ...message, sentAt }, null, 2),
    )
}
