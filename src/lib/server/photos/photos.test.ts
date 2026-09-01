import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { photos } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'

/* The bucket is genuinely external, like Stripe and Resend, so it is mocked. The database is not:
   these assert on rows, and on which rows each query returns.

   What is being pinned is the moderation gate. Upload carries no credential (ADR 0009), so
   "nothing is public until an organiser approves it" is the only protection the feature has, and it
   is enforced in two independent places — the gallery query and the byte proxy's key lookup. Both
   are tested, because a photo that is merely unlisted is not the same as one that is unreachable. */

const putObject = vi.fn(async () => {})
const deleteObjects = vi.fn(async () => {})

vi.mock('$lib/server/storage', () => ({
    putObject: (...args: unknown[]) => putObject(...(args as [])),
    deleteObjects: (...args: unknown[]) => deleteObjects(...(args as [])),
    getObjectBody: vi.fn(),
}))

const { createPhoto } = await import('./createPhoto')
const { getApprovedPhotos } = await import('./getApprovedPhotos')
const { getPhotosForModeration } = await import('./getPhotosForModeration')
const { getServablePhotoKey } = await import('./getServablePhotoKey')
const { getPhotoKey } = await import('./getPhotoKey')
const { setPhotoStatus } = await import('./setPhotoStatus')
const { deletePhoto } = await import('./deletePhoto')
const { getApprovedPhoto } = await import('./getApprovedPhoto')
const { getPhotoYears } = await import('./getPhotoYears')
const { getApprovedPhotoKeysForYear } = await import('./getApprovedPhotoKeysForYear')

let db: Awaited<ReturnType<typeof resetTestDb>>

async function samplePhoto(): Promise<Uint8Array> {
    const buffer = await sharp({
        create: { width: 1200, height: 900, channels: 3, background: '#557' },
    })
        .jpeg()
        .toBuffer()
    return new Uint8Array(buffer)
}

beforeEach(async () => {
    db = await resetTestDb()
    putObject.mockClear()
    deleteObjects.mockClear()
})

describe('createPhoto', () => {
    it('writes the row as pending, whatever the contributor sent', async () => {
        const id = await createPhoto({
            bytes: await samplePhoto(),
            caption: '  Reunion picnic  ',
            contributorName: '  Ruth  ',
        })

        const [row] = await db.select().from(photos)
        expect(row.id).toBe(id)
        expect(row.status).toBe('pending')
        /* Trimmed on arrival — it is untrusted free text. */
        expect(row.caption).toBe('Reunion picnic')
        expect(row.contributorName).toBe('Ruth')
    })

    it('stores two renditions and records the display dimensions', async () => {
        await createPhoto({ bytes: await samplePhoto() })

        expect(putObject).toHaveBeenCalledTimes(2)
        const [row] = await db.select().from(photos)
        expect(row.displayKey).toContain('display')
        expect(row.thumbKey).toContain('thumb')
        expect(row.width).toBe(1200)
        expect(row.height).toBe(900)
    })

    it('writes no row when the bytes cannot be decoded', async () => {
        await expect(
            createPhoto({ bytes: new TextEncoder().encode('not a photo') }),
        ).rejects.toThrow()

        expect(await db.select().from(photos)).toHaveLength(0)
        expect(putObject).not.toHaveBeenCalled()
    })
})

describe('the moderation gate', () => {
    it('keeps a pending photo out of the public gallery', async () => {
        await createPhoto({ bytes: await samplePhoto() })

        expect(await getApprovedPhotos()).toHaveLength(0)
        expect(await getPhotosForModeration()).toHaveLength(1)
    })

    it('will not serve the bytes of a pending photo', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        expect(await getServablePhotoKey(id, 'display')).toBeUndefined()
        expect(await getServablePhotoKey(id, 'thumb')).toBeUndefined()
    })

    it('serves a pending photo to the admin lookup, which is how it gets moderated', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        expect(await getPhotoKey(id, 'display')).toContain('display')
    })

    it('publishes on approval, in the gallery and through the proxy alike', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        await setPhotoStatus(id, 'approved')

        expect(await getApprovedPhotos()).toHaveLength(1)
        expect(await getPhotosForModeration()).toHaveLength(0)
        expect(await getServablePhotoKey(id, 'thumb')).toContain('thumb')
    })

    it('makes an approved photo unreachable again the moment it is rejected', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')
        expect(await getServablePhotoKey(id, 'display')).toBeDefined()

        await setPhotoStatus(id, 'rejected')

        expect(await getApprovedPhotos()).toHaveLength(0)
        expect(await getServablePhotoKey(id, 'display')).toBeUndefined()
        /* Rejected is not deleted: the row and its objects survive the decision. */
        expect(await db.select().from(photos)).toHaveLength(1)
    })

    it('never returns a bucket key to the gallery caller', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(id, 'approved')

        const [gallery] = await getApprovedPhotos()

        expect(Object.keys(gallery)).not.toContain('displayKey')
        expect(Object.keys(gallery)).not.toContain('thumbKey')
    })
})

describe('deletePhoto', () => {
    it('removes the objects before the row, since the row is their only pointer', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })
        const [row] = await db.select().from(photos)

        await deletePhoto(id)

        expect(deleteObjects).toHaveBeenCalledWith([row.displayKey, row.thumbKey])
        expect(await db.select().from(photos)).toHaveLength(0)
    })

    it('is a no-op for an id that is already gone, so it can be retried', async () => {
        await expect(deletePhoto('00000000-0000-0000-0000-000000000000')).resolves.toBeUndefined()
        expect(deleteObjects).not.toHaveBeenCalled()
    })
})

describe('the single-photo page query', () => {
    it('returns an approved photo', async () => {
        const id = await createPhoto({ bytes: await samplePhoto(), caption: 'The picnic' })
        await setPhotoStatus(id, 'approved')

        expect(await getApprovedPhoto(id)).toMatchObject({ id, caption: 'The picnic' })
    })

    it('hides pending and rejected alike, so a URL cannot confirm one existed', async () => {
        const id = await createPhoto({ bytes: await samplePhoto() })

        expect(await getApprovedPhoto(id)).toBeUndefined()

        await setPhotoStatus(id, 'rejected')
        expect(await getApprovedPhoto(id)).toBeUndefined()

        expect(await getApprovedPhoto('00000000-0000-0000-0000-000000000000')).toBeUndefined()
    })
})

describe('years', () => {
    it('counts only approved photos, newest year first', async () => {
        const a = await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })
        const b = await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })
        const c = await createPhoto({ bytes: await samplePhoto(), takenYear: 2027 })
        const pending = await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })
        for (const id of [a, b, c]) {
            await setPhotoStatus(id, 'approved')
        }

        expect(await getPhotoYears()).toEqual([
            { year: 2027, photoCount: 1 },
            { year: 2025, photoCount: 2 },
        ])
        expect(pending).toBeDefined()
    })

    it('omits photos with no year rather than inventing one', async () => {
        const dated = await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })
        const undated = await createPhoto({ bytes: await samplePhoto() })
        await setPhotoStatus(dated, 'approved')
        await setPhotoStatus(undated, 'approved')

        expect(await getPhotoYears()).toEqual([{ year: 2025, photoCount: 1 }])
        /* Still browsable in the full grid, just not in a year bucket. */
        expect(await getApprovedPhotos()).toHaveLength(2)
    })

    it("gives the zip only that year's approved photos", async () => {
        const wanted = await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })
        const otherYear = await createPhoto({ bytes: await samplePhoto(), takenYear: 2027 })
        const notApproved = await createPhoto({ bytes: await samplePhoto(), takenYear: 2025 })
        await setPhotoStatus(wanted, 'approved')
        await setPhotoStatus(otherYear, 'approved')

        const keys = await getApprovedPhotoKeysForYear(2025)

        expect(keys).toHaveLength(1)
        expect(keys[0].id).toBe(wanted)
        expect(keys.map((k) => k.id)).not.toContain(notApproved)
    })
})
