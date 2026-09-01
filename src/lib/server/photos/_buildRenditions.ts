import sharp from 'sharp'
import {
    PHOTO_DISPLAY_EDGE,
    PHOTO_JPEG_QUALITY,
    PHOTO_MAX_PIXELS,
    PHOTO_THUMB_EDGE,
} from '$lib/general/constants'

export type Rendition = {
    body: Uint8Array
    width: number
    height: number
}

export type Renditions = {
    display: Rendition
    thumb: Rendition
}

/* Turns arbitrary uploaded bytes into two safe, web-sized JPEGs, or throws.

   THE DECODE IS THE VALIDATION. A Content-Type header is supplied by the caller and means nothing;
   a file extension means less. What cannot be forged is that libvips parses the bytes as a raster
   image, so anything reaching the bucket has been decoded and re-encoded from scratch. A polyglot
   file that is both a valid JPEG and a valid script does not survive that round trip.

   SVG IS REFUSED EXPLICITLY. libvips will happily rasterise it, but an SVG is a document: it can
   carry script and fetch remote resources, and it is the one "image" format that is dangerous to
   serve back to a browser verbatim. It is rejected by format name rather than by any heuristic.

   ALL METADATA IS DROPPED. sharp only copies EXIF when asked, so this is the default rather than
   an added step — but it is the single most important property of this function and there is a
   test asserting it, because the default changing silently would publish the GPS coordinates of
   family homes attached to photographs of their children. Orientation is the one tag that must
   survive, and .rotate() applies it to the pixels before it is discarded, so a portrait phone photo
   is not served on its side. */
export async function buildRenditions(input: Uint8Array): Promise<Renditions> {
    const probe = sharp(input, { failOn: 'error' })
    const metadata = await probe.metadata()

    if (!metadata.format || metadata.format === 'svg') {
        throw new Error('Unsupported image format')
    }
    if (!metadata.width || !metadata.height) {
        throw new Error('Image has no dimensions')
    }
    if (metadata.width * metadata.height > PHOTO_MAX_PIXELS) {
        throw new Error('Image is too large')
    }

    const render = async (edge: number): Promise<Rendition> => {
        const { data, info } = await sharp(input, { failOn: 'error' })
            .rotate()
            .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: PHOTO_JPEG_QUALITY, mozjpeg: true })
            .toBuffer({ resolveWithObject: true })
        return { body: new Uint8Array(data), width: info.width, height: info.height }
    }

    const [display, thumb] = await Promise.all([
        render(PHOTO_DISPLAY_EDGE),
        render(PHOTO_THUMB_EDGE),
    ])

    return { display, thumb }
}
