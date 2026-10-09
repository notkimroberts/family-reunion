import libheif from 'libheif-js/wasm-bundle'

export type DecodedPixels = { data: Uint8ClampedArray; width: number; height: number }

/* Decodes run one at a time. display() is asynchronous, so two overlapping uploads would hold two
   decoded bitmaps in the one WebAssembly heap at once — and that heap never shrinks. */
let previousDecode: Promise<unknown> = Promise.resolve()

/* Decodes the primary image of a HEVC-coded HEIF — what an iPhone writes — to RGBA pixels.

   This exists because the prebuilt libvips inside sharp has no HEVC decoder (patents), so sharp can
   READ a HEIC's header but not its pixels. libheif-js is libheif compiled to WebAssembly, which
   also keeps a hostile file inside the wasm sandbox rather than in native code.

   libheif applies the HEIF rotation and mirror boxes itself, so the pixels come back upright. The
   EXIF Orientation tag must NOT be applied on top: for HEIF it is informational, and honouring it
   would rotate an iPhone portrait twice.

   Measured: a 12 MP photo costs ~300 MB of RSS and a 24 MP one ~540 MB, and the process keeps that
   high-water mark afterwards — wasm memory grows but is not returned. */
export function decodeHeic(input: Uint8Array): Promise<DecodedPixels> {
    const decode = previousDecode.then(() => decodeNow(input))
    previousDecode = decode.catch(() => undefined)
    return decode
}

// The decode itself. Frees every libheif object, whether or not it succeeds.
async function decodeNow(input: Uint8Array): Promise<DecodedPixels> {
    const decoder = new libheif.HeifDecoder()
    const images = decoder.decode(input)
    try {
        const image = images[0]
        if (!image) {
            throw new Error('HEIF file holds no image')
        }
        const width = image.get_width()
        const height = image.get_height()
        return await new Promise<DecodedPixels>((resolve, reject) => {
            image.display(
                { data: new Uint8ClampedArray(width * height * 4), width, height },
                (result) => {
                    if (result) {
                        resolve(result)
                    } else {
                        reject(new Error('HEIF decode failed'))
                    }
                },
            )
        })
    } finally {
        images.forEach((image) => {
            image.free()
        })
        decoder.decoder.delete()
    }
}
