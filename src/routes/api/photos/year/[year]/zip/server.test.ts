import { Readable } from 'node:stream'
import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'

/* The per-year zip. The bucket is mocked; the database is real.

   Worth testing rather than eyeballing: the handler returns a Response before the archive has
   finished being written, so "does anything actually come out of the stream, and is it a zip"
   is not obvious from reading it. */

const getObjectStream = vi.fn(async () => Readable.from([Buffer.from('fake-jpeg-bytes')]))

vi.mock('$lib/server/storage', () => ({
    putObject: vi.fn(async () => {}),
    deleteObjects: vi.fn(async () => {}),
    getObjectBody: vi.fn(),
    getObjectStream: () => getObjectStream(),
}))

const { GET } = await import('./+server')
const { createPhoto } = await import('$lib/server/photos/createPhoto')
const { setPhotoStatus } = await import('$lib/server/photos/setPhotoStatus')

async function samplePhoto(): Promise<Uint8Array> {
    const buffer = await sharp({
        create: { width: 300, height: 200, channels: 3, background: '#369' },
    })
        .jpeg()
        .toBuffer()
    return new Uint8Array(buffer)
}

async function zip(year: string) {
    return GET({ params: { year } } as unknown as Parameters<typeof GET>[0])
}

async function statusOf(result: ReturnType<typeof GET>): Promise<number> {
    try {
        return (await result).status
    } catch (thrown) {
        return (thrown as { status: number }).status
    }
}

async function approvedPhoto(takenYear: number) {
    const id = await createPhoto({ bytes: await samplePhoto(), takenYear })
    await setPhotoStatus(id, 'approved')
    return id
}

beforeEach(async () => {
    await resetTestDb()
    getObjectStream.mockClear()
})

describe('GET /api/photos/year/[year]/zip', () => {
    it('streams a real zip with one entry per photo', async () => {
        await approvedPhoto(2025)
        await approvedPhoto(2025)

        const response = await zip('2025')
        const bytes = Buffer.from(await response.arrayBuffer())

        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe('application/zip')
        /* PK\\x03\\x04 — the local file header magic. Proves bytes actually flowed rather than the
           stream closing empty, which is the failure mode of getting the async write wrong. */
        expect(bytes.subarray(0, 4).toString('latin1')).toBe('PK')
        expect(getObjectStream).toHaveBeenCalledTimes(2)
    })

    it('names the file after the year, so a phone download is identifiable', async () => {
        await approvedPhoto(2025)

        const response = await zip('2025')

        expect(response.headers.get('content-disposition')).toBe(
            'attachment; filename="patterson-reunion-2025-photos.zip"',
        )
    })

    it('sends no content-length, which would truncate a stream of unknown size', async () => {
        await approvedPhoto(2025)

        expect((await zip('2025')).headers.get('content-length')).toBeNull()
    })

    it('404s a year with no approved photos rather than sending an empty zip', async () => {
        await approvedPhoto(2025)

        expect(await statusOf(zip('2027'))).toBe(404)
    })

    it('404s a year that is not a year', async () => {
        expect(await statusOf(zip('banana'))).toBe(404)
        expect(await statusOf(zip('12'))).toBe(404)
    })

    it('excludes photos that are not approved', async () => {
        await approvedPhoto(2025)
        await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })

        await (await zip('2025')).arrayBuffer()

        expect(getObjectStream).toHaveBeenCalledTimes(1)
    })
})
