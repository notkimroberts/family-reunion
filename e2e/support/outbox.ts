import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect } from '@playwright/test'
import { E2E_OUTBOX_DIR } from './env'

export type OutboxEmail = {
    from: string
    replyTo: string
    to: string
    subject: string
    text: string
    html?: string
    idempotencyKey?: string
    sentAt: string
}

/* Every email the server has "sent" since the last reset, oldest first. */
export async function readOutbox(): Promise<OutboxEmail[]> {
    const files = await readdir(E2E_OUTBOX_DIR).catch(() => [])
    const emails = await Promise.all(
        files
            .filter((file) => file.endsWith('.json'))
            .map(async (file) => JSON.parse(await readFile(join(E2E_OUTBOX_DIR, file), 'utf8'))),
    )
    return emails.sort((a, b) => a.sentAt.localeCompare(b.sentAt))
}

/* Waits for the outbox to hold exactly `count` emails — webhooks arrive asynchronously, so an email
   is polled for rather than expected at once. */
export async function waitForEmails(count: number, timeoutMs = 30_000): Promise<OutboxEmail[]> {
    await expect.poll(async () => (await readOutbox()).length, { timeout: timeoutMs }).toBe(count)
    return readOutbox()
}
