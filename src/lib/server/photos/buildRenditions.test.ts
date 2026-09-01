import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { PHOTO_DISPLAY_EDGE, PHOTO_THUMB_EDGE } from '$lib/general/constants'
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
})
