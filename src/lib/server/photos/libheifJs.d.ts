/* libheif-js ships emscripten types for the raw C API only, not for the HeifDecoder wrapper this
   app uses. Just the surface _decodeHeic calls. */
declare module 'libheif-js/wasm-bundle' {
    type DisplayBuffer = { data: Uint8ClampedArray; width: number; height: number }

    interface HeifImage {
        get_width(): number
        get_height(): number
        display(buffer: DisplayBuffer, callback: (result: DisplayBuffer | null) => void): void
        free(): void
    }

    class HeifDecoder {
        decoder: { delete(): void }
        /* Returns [] rather than throwing on bytes it cannot parse. */
        decode(buffer: Uint8Array): HeifImage[]
    }

    const libheif: { HeifDecoder: typeof HeifDecoder }
    export default libheif
}
