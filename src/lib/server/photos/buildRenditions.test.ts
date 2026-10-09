import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { PHOTO_DISPLAY_EDGE, PHOTO_THUMB_EDGE } from '$lib/general/constants'
import { UnreadablePhotoError } from './UnreadablePhotoError'
import { buildRenditions } from './_buildRenditions'

/* The processing pipeline is the whole of the input validation on an endpoint that carries no
   credential, so these are not "does sharp work" tests — each one pins a property the feature
   depends on. See ADR 0009. */

/* A JPEG carrying GPS coordinates, built rather than fixtured so the tag is unambiguously present
   before the assertion runs — a fixture that quietly lost its EXIF would make the test pass for the
   wrong reason. */
async function jpegWithGps(width = 2400, height = 1800): Promise<Uint8Array> {
    const buffer = await sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 120, g: 90, b: 60 },
        },
    })
        /* libvips maps the GPS IFD to IFD3 — that is where a phone's coordinates actually land, and
           sharp's Exif type names the directories rather than the tags. */
        .withExif({
            IFD0: { Copyright: 'Patterson Family' },
            IFD3: { GPSLatitudeRef: 'N', GPSLongitudeRef: 'W' },
        })
        .jpeg()
        .toBuffer()
    return new Uint8Array(buffer)
}

describe('buildRenditions', () => {
    it('strips EXIF, including the GPS directory', async () => {
        const input = await jpegWithGps()

        /* Prove the input really carries what is claimed to be removed, so a fixture that quietly
           lost its EXIF cannot make this pass for the wrong reason. */
        const before = await sharp(input).metadata()
        expect(before.exif).toBeDefined()
        expect(Buffer.from(before.exif!).toString('latin1')).toContain('Patterson Family')

        const { display, thumb } = await buildRenditions(input)

        const displayMeta = await sharp(display.body).metadata()
        const thumbMeta = await sharp(thumb.body).metadata()
        expect(displayMeta.exif).toBeUndefined()
        expect(thumbMeta.exif).toBeUndefined()

        /* Belt and braces: the tag value must not survive anywhere in the output bytes, EXIF block
           or otherwise. */
        expect(Buffer.from(display.body).toString('latin1')).not.toContain('Patterson Family')
    })

    it('resizes the longest edge to the display and thumb bounds', async () => {
        const { display, thumb } = await buildRenditions(await jpegWithGps(4032, 3024))

        expect(Math.max(display.width, display.height)).toBe(PHOTO_DISPLAY_EDGE)
        expect(Math.max(thumb.width, thumb.height)).toBe(PHOTO_THUMB_EDGE)
        /* Aspect ratio preserved rather than cropped. */
        expect(display.width / display.height).toBeCloseTo(4032 / 3024, 2)
    })

    it('does not enlarge an image that is already smaller than the bound', async () => {
        const { display } = await buildRenditions(await jpegWithGps(800, 600))

        expect(display.width).toBe(800)
        expect(display.height).toBe(600)
    })

    it('rejects SVG, which libvips would otherwise happily rasterise', async () => {
        const svg = new TextEncoder().encode(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100"/></svg>',
        )

        await expect(buildRenditions(svg)).rejects.toThrow()
    })

    it('rejects bytes that are not an image at all', async () => {
        const notAnImage = new TextEncoder().encode('#!/bin/sh\necho not a photo\n')

        await expect(buildRenditions(notAnImage)).rejects.toThrow()
    })

    /* The upload action tells the visitor "not a photo" only for this class; anything else is
       treated as a server failure and reported. */
    it('throws UnreadablePhotoError for bytes it cannot decode', async () => {
        const notAnImage = new TextEncoder().encode('#!/bin/sh\necho not a photo\n')

        await expect(buildRenditions(notAnImage)).rejects.toBeInstanceOf(UnreadablePhotoError)
    })

    it('refuses an image above the pixel cap before decoding it', async () => {
        /* PHOTO_MAX_PIXELS is a MEMORY bound — libvips holds the decoded bitmap, so this is what
           stands between one enormous upload and an OOM on a container that idles at ~150 MB. A
           thin 40 MP strip is cheap to construct and cheap to reject, which is the point: the
           check reads metadata and throws before any pixels are decoded. */
        const huge = new Uint8Array(
            await sharp({
                create: { width: 40_000, height: 1_000, channels: 3, background: '#111' },
            })
                .jpeg()
                .toBuffer(),
        )

        await expect(buildRenditions(huge)).rejects.toThrow('Image is too large')
    })

    it('re-encodes as JPEG whatever went in, so a polyglot cannot survive', async () => {
        const png = new Uint8Array(
            await sharp({
                create: { width: 500, height: 400, channels: 3, background: '#333' },
            })
                .png()
                .toBuffer(),
        )

        const { display } = await buildRenditions(png)

        expect((await sharp(display.body).metadata()).format).toBe('jpeg')
    })

    /* An iPhone writes HEVC-coded HEIF, which the prebuilt libvips in sharp cannot decode.
       The fixture was made with macOS `sips`: a 120×80 image, red left and blue right, carrying EXIF
       (a 2019 DateTimeOriginal and a GPS directory), then rotated 90° clockwise. sips records that
       rotation as an `irot` box, not by moving pixels — exactly as a phone does. */
    describe('HEIC', () => {
        const heicFixture = () =>
            readFile(new URL('./fixtures/rotatedPortrait.heic', import.meta.url)).then(
                (buffer) => new Uint8Array(buffer),
            )

        it('decodes it, upright: the irot box is applied once', async () => {
            const { display } = await buildRenditions(await heicFixture())

            expect(display).toMatchObject({ width: 80, height: 120 })
            // Rotated clockwise, the red left half is now the top.
            const { data } = await sharp(display.body)
                .extract({ left: 40, top: 10, width: 1, height: 1 })
                .raw()
                .toBuffer({ resolveWithObject: true })
            expect(data[0]).toBeGreaterThan(200)
            expect(data[2]).toBeLessThan(60)
        })

        it('reads the year from its EXIF, and strips all of it from the renditions', async () => {
            const input = await heicFixture()
            expect((await sharp(input).metadata()).exif).toBeDefined()

            const { display, thumb, takenYear } = await buildRenditions(input)

            expect(takenYear).toBe(2019)
            expect((await sharp(display.body).metadata()).exif).toBeUndefined()
            expect((await sharp(thumb.body).metadata()).exif).toBeUndefined()
        })

        it('throws UnreadablePhotoError for a truncated HEIC', async () => {
            const input = await heicFixture()

            await expect(buildRenditions(input.slice(0, input.length / 2))).rejects.toBeInstanceOf(
                UnreadablePhotoError,
            )
        })
    })
})
