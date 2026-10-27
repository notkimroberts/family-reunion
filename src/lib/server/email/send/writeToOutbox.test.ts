import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeToOutbox } from './_writeToOutbox'

const MESSAGE = {
    from: 'Reunion <organizers@example.com>',
    replyTo: 'organizers@example.com',
    to: 'alice@example.com',
    subject: 'Confirmed',
    text: 'Body',
    idempotencyKey: 'confirm/1',
}

let dir: string

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'outbox-'))
})

afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
})

async function written() {
    const files = await readdir(dir)
    return Promise.all(
        files.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8'))),
    )
}

describe('writeToOutbox', () => {
    it('writes the whole message, with the time it was sent', async () => {
        await writeToOutbox(dir, MESSAGE, undefined)

        const [message] = await written()
        expect(message).toMatchObject(MESSAGE)
        expect(Date.parse(message.sentAt)).not.toBeNaN()
    })

    /* A repeated key is still written: the tests check that the app never sends twice. */
    it('writes every attempt, including a repeated idempotency key', async () => {
        await writeToOutbox(dir, MESSAGE, undefined)
        await writeToOutbox(dir, MESSAGE, undefined)

        expect(await written()).toHaveLength(2)
    })

    it('refuses on Railway and writes nothing', async () => {
        await expect(writeToOutbox(dir, MESSAGE, 'production')).rejects.toThrow(/Railway/)

        expect(await readdir(dir)).toEqual([])
    })
})
