import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { env } from '$env/dynamic/private'

/* The browser abandoning a page of thumbnails must cancel the bucket requests behind it — in flight
   or still queued — rather than leave them holding or waiting for sockets nobody will read from.
   Against a real server that never answers, so only the abort can end the request. */

let server: Server

beforeAll(async () => {
    server = createServer(() => {
        /* Never respond. */
    })
    /* Rejects rather than hangs if the port cannot be bound (a sandbox can refuse it). */
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
    })
    Object.assign(env, {
        BUCKET_NAME: 'photos',
        BUCKET_ENDPOINT: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        BUCKET_ACCESS_KEY_ID: 'id',
        BUCKET_SECRET_ACCESS_KEY: 'secret',
    })
})

afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
})

const ABORT_AFTER_MS = 50
const MUCH_LESS_THAN_THE_IDLE_TIMEOUT_MS = 2_000

describe('getObjectBody', () => {
    it('gives up as soon as the request signal aborts', async () => {
        const { getObjectBody } = await import('./getObjectBody')
        const controller = new AbortController()
        const started = Date.now()
        setTimeout(() => controller.abort(), ABORT_AFTER_MS)

        const result = await getObjectBody('k', controller.signal)

        expect(result).toBeUndefined()
        expect(Date.now() - started).toBeLessThan(MUCH_LESS_THAN_THE_IDLE_TIMEOUT_MS)
    })
})
