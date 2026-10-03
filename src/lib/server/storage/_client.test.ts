import { Agent, createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bucketHttpOptionsValue } from './_bucketHttpOptionsValue'

/* What wedged the gallery: a request to a connection that never answers holds its pooled socket
   until something destroys it. With no timeout nothing does, and once every socket is held each
   later request waits forever.

   Both halves run against a REAL server that accepts and never replies, with a pool of two so the
   effect shows in milliseconds. The control proves that without timeouts the third request is
   starved and nothing settles. The treatment proves that with production's timeout options every
   request — including the one still queued for a socket — fails promptly, and the pool is usable
   again afterwards. Production's actual values are pinned separately below.

   Under node only: Bun's http Agent does not enforce maxSockets, so this would pass vacuously
   there — one more reason `bun test` is blocked in this repo. */

let server: Server
let connections = 0
let endpoint = ''

/* Production's option keys at test-sized values: the connect succeeds at once, so the request and
   socket timeouts are what end each stalled request. */
const TEST_TIMEOUTS = { connectionTimeout: 100, requestTimeout: 200, socketTimeout: 300 }
const SETTLE_MS = 700
const PROMPTLY_MS = 1_500

beforeEach(async () => {
    connections = 0
    server = createServer(() => {
        /* Never respond. */
    })
    server.on('connection', () => {
        connections += 1
    })
    /* Rejects rather than hangs if the port cannot be bound (a sandbox can refuse it). */
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
    })
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterEach(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
})

/* An Agent INSTANCE, not options: for plain http the SDK builds its agent lazily, and three
   concurrent first requests each build their own — three pools of two, which hides the effect. */
function clientWith(timeouts: Partial<typeof bucketHttpOptionsValue> = {}) {
    return new S3Client({
        endpoint,
        region: 'auto',
        forcePathStyle: true,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        /* One attempt, so the timing is the timeout's and not the retry policy's. */
        maxAttempts: 1,
        requestHandler: {
            ...timeouts,
            httpAgent: new Agent({ keepAlive: true, maxSockets: 2 }),
        },
    })
}

function getThree(client: S3Client) {
    return [1, 2, 3].map((n) =>
        client.send(new GetObjectCommand({ Bucket: 'b', Key: `k${n}` })).catch((err) => err),
    )
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('bucket client connection pool', () => {
    it('CONTROL: without timeouts, a full pool starves every later request', async () => {
        const client = clientWith()
        let settled = 0
        for (const result of getThree(client)) {
            void result.then(() => (settled += 1))
        }

        await wait(SETTLE_MS)

        expect(connections).toBe(2)
        expect(settled).toBe(0)
        client.destroy()
    })

    it('with the timeouts, every stalled request fails promptly and the pool frees', async () => {
        const client = clientWith({ ...bucketHttpOptionsValue, ...TEST_TIMEOUTS })
        const started = Date.now()

        const results = await Promise.all(getThree(client))

        expect(Date.now() - started).toBeLessThan(PROMPTLY_MS)
        for (const result of results) {
            expect(result).toMatchObject({ name: 'TimeoutError' })
        }
        /* A request after the storm gets a socket at once: nothing is still holding the pool. */
        const connectionsBefore = connections
        void getThree(client)[0]
        await wait(TEST_TIMEOUTS.connectionTimeout)
        expect(connections).toBeGreaterThan(connectionsBefore)
        client.destroy()
    })

    /* Production's values, so the guard cannot be quietly removed. */
    it('production sets every timeout, and makes the request timeout throw', () => {
        expect(bucketHttpOptionsValue.connectionTimeout).toBeGreaterThan(0)
        expect(bucketHttpOptionsValue.requestTimeout).toBeGreaterThan(0)
        expect(bucketHttpOptionsValue.socketTimeout).toBeGreaterThan(0)
        /* Without it requestTimeout only logs a warning and the request carries on. */
        expect(bucketHttpOptionsValue.throwOnRequestTimeout).toBe(true)
    })

    it('getBucketClient uses those options', async () => {
        vi.resetModules()
        const constructed: unknown[] = []
        vi.doMock('@aws-sdk/client-s3', () => ({
            S3Client: class {
                constructor(config: unknown) {
                    constructed.push(config)
                }
            },
        }))
        const { env } = await import('$env/dynamic/private')
        Object.assign(env, {
            BUCKET_NAME: 'photos',
            BUCKET_ENDPOINT: 'https://example.com',
            BUCKET_ACCESS_KEY_ID: 'id',
            BUCKET_SECRET_ACCESS_KEY: 'secret',
        })
        const { getBucketClient } = await import('./_client')

        getBucketClient()

        expect(constructed[0]).toMatchObject({ requestHandler: bucketHttpOptionsValue })
        vi.doUnmock('@aws-sdk/client-s3')
    })
})
