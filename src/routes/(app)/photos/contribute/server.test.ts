import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PHOTO_MAX_PER_REQUEST } from '$lib/general/constants'
import { photos } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { resetUploadRateLimits } from '$lib/server/photos/uploadRateLimit'

/* The public upload POST. No credential — see ADR 0009 — so what is pinned here is that the three
   things standing in for one all hold: the batch caps, the size cap, and that every row lands
   'pending' no matter what the request asked for. The bucket is mocked; the database is real. */

vi.mock('$lib/server/storage', () => ({
    putObject: vi.fn(async () => {}),
    deleteObjects: vi.fn(async () => {}),
    getObjectBody: vi.fn(),
}))

const { actions } = await import('./+page.server')

let db: Awaited<ReturnType<typeof resetTestDb>>

/* Returns an ArrayBuffer rather than a Uint8Array: File wants a BlobPart, and a Uint8Array over a
   possibly-shared buffer is not one. */
async function jpeg(width = 900, height = 700): Promise<ArrayBuffer> {
    const buffer = await sharp({
        create: { width, height, channels: 3, background: '#446' },
    })
        .jpeg()
        .toBuffer()
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function contribute(files: BlobPart[], fields: Record<string, string> = {}) {
    const formData = new FormData()
    for (const [index, bytes] of files.entries()) {
        formData.append('photos', new File([bytes], `photo-${index}.jpg`, { type: 'image/jpeg' }))
    }
    for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value)
    }

    return actions.default({
        request: new Request('http://localhost/photos/contribute', {
            method: 'POST',
            body: formData,
        }),
        getClientAddress: () => '203.0.113.9',
    } as unknown as Parameters<typeof actions.default>[0])
}

beforeEach(async () => {
    db = await resetTestDb()
    resetUploadRateLimits()
})

describe('POST /photos/contribute', () => {
    it('accepts a photo and leaves it pending', async () => {
        const result = await contribute([await jpeg()], { contributorName: 'Ruth' })

        expect(result).toMatchObject({ accepted: 1 })
        const [row] = await db.select().from(photos)
        expect(row.status).toBe('pending')
        expect(row.contributorName).toBe('Ruth')
    })

    it('refuses an empty submission', async () => {
        const result = await contribute([])

        expect(result).toMatchObject({ status: 400 })
        expect(await db.select().from(photos)).toHaveLength(0)
    })

    it('refuses more than the per-request cap', async () => {
        const one = await jpeg(80, 80)
        const tooMany = Array.from({ length: PHOTO_MAX_PER_REQUEST + 1 }, () => one)

        const result = await contribute(tooMany)

        expect(result).toMatchObject({ status: 400 })
        expect(await db.select().from(photos)).toHaveLength(0)
    })

    it('keeps the readable photos when one file in the batch is not an image', async () => {
        const result = await contribute([await jpeg(), new TextEncoder().encode('not a photo')])

        expect(result).toMatchObject({ accepted: 1 })
        expect(await db.select().from(photos)).toHaveLength(1)
    })

    it('fails the request when nothing in it could be read', async () => {
        const result = await contribute([new TextEncoder().encode('#!/bin/sh')])

        expect(result).toMatchObject({ status: 400 })
        expect(await db.select().from(photos)).toHaveLength(0)
    })

    it('refuses once the address has exhausted its window', async () => {
        const one = await jpeg(80, 80)
        for (let i = 0; i < 4; i += 1) {
            await contribute(Array.from({ length: 10 }, () => one))
        }

        const result = await contribute([one])

        expect(result).toMatchObject({ status: 429 })
    })
})
