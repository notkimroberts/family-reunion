import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'

/* The byte proxy is the second half of the moderation gate — the gallery query decides what is
   LISTED, this decides what is REACHABLE. A photo that is merely unlisted is still served to anyone
   holding its id, which is what would make rejecting one meaningless. See ADR 0009.

   The bucket is mocked; the database is real, because the thing under test is which rows the two
   key lookups will resolve. */

const getObjectBody = vi.fn(async () => ({
    body: new ReadableStream({
        start(controller) {
            controller.close()
        },
    }),
    contentType: 'image/jpeg',
    contentLength: 1234,
    etag: '"abc123"',
}))

vi.mock('$lib/server/storage', () => ({
    putObject: vi.fn(async () => {}),
    deleteObjects: vi.fn(async () => {}),
    getObjectBody: (...args: unknown[]) => getObjectBody(...(args as [])),
}))

const { GET } = await import('./+server')
const { createPhoto } = await import('$lib/server/photos/createPhoto')
const { setPhotoStatus } = await import('$lib/server/photos/setPhotoStatus')

async function samplePhoto(): Promise<Uint8Array> {
    const buffer = await sharp({
        create: { width: 600, height: 400, channels: 3, background: '#246' },
    })
        .jpeg()
        .toBuffer()
    return new Uint8Array(buffer)
}

function request(
    id: string,
    variant: string,
    user?: { role: string },
    options: { search?: string; ifNoneMatch?: string } = {},
) {
    const headers = new Headers()
    if (options.ifNoneMatch) {
        headers.set('if-none-match', options.ifNoneMatch)
    }
    return GET({
        params: { id, variant },
        url: new URL(`http://localhost/api/photos/${id}/${variant}${options.search ?? ''}`),
        request: new Request('http://localhost', { headers }),
        locals: { user },
        setHeaders: () => {},
    } as unknown as Parameters<typeof GET>[0])
}

async function statusOf(result: ReturnType<typeof GET>): Promise<number> {
    try {
        return (await result).status
    } catch (thrown) {
        /* SvelteKit's error() throws an HttpError rather than returning a Response. */
        return (thrown as { status: number }).status
    }
}

beforeEach(async () => {
    await resetTestDb()
    getObjectBody.mockClear()
})

describe('GET /api/photos/[id]/[variant]', () => {
    it('404s a pending photo for the public', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        expect(await statusOf(request(id, 'display'))).toBe(404)
        expect(getObjectBody).not.toHaveBeenCalled()
    })

    it('serves a pending photo to an admin, who has to see it to moderate it', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        expect(await statusOf(request(id, 'display', { role: 'admin' }))).toBe(200)
    })

    it('does not treat a signed-in non-admin as an admin', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        expect(await statusOf(request(id, 'display', { role: 'user' }))).toBe(404)
    })

    it('serves an approved photo to anyone', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')

        expect(await statusOf(request(id, 'display'))).toBe(200)
        expect(await statusOf(request(id, 'thumb'))).toBe(200)
    })

    it('stops serving the moment a photo is rejected', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')
        expect(await statusOf(request(id, 'display'))).toBe(200)

        await setPhotoStatus(id, 'rejected')

        expect(await statusOf(request(id, 'display'))).toBe(404)
    })

    it('404s an unknown variant rather than guessing', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')

        expect(await statusOf(request(id, 'original'))).toBe(404)
    })

    it('404s an id that does not exist', async () => {
        expect(await statusOf(request('00000000-0000-0000-0000-000000000000', 'display'))).toBe(404)
    })
})

describe('caching and download', () => {
    it('answers 304 when the client already holds the etag', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')

        const response = await request(id, 'display', undefined, { ifNoneMatch: '"abc123"' })

        expect(response.status).toBe(304)
    })

    it('does NOT 304 a photo that has since been rejected — it 404s', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')
        await setPhotoStatus(id, 'rejected')

        /* The permission check runs before the etag comparison. A browser holding a good etag for a
           rejected photo must be told the photo is gone, not that its copy is still valid. */
        expect(await statusOf(request(id, 'display', undefined, { ifNoneMatch: '"abc123"' }))).toBe(
            404,
        )
    })

    it('keeps the cache private and short, so no shared proxy outlives a rejection', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')

        const response = await request(id, 'display')

        expect(response.headers.get('cache-control')).toBe('private, max-age=300')
        expect(response.headers.get('etag')).toBe('"abc123"')
    })

    it('sets an attachment disposition only when ?download is asked for', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')

        const inline = await request(id, 'display')
        expect(inline.headers.get('content-disposition')).toBeNull()

        const download = await request(id, 'display', undefined, { search: '?download' })
        expect(download.headers.get('content-disposition')).toContain('attachment')
    })
})
