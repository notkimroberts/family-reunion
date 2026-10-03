import { once } from 'node:events'
import { Readable } from 'node:stream'
import { error } from '@sveltejs/kit'
import { ZipArchive } from 'archiver'
import { getApprovedPhotoKeysForYear } from '$lib/server/photos'
import { getObjectStream } from '$lib/server/storage'
import type { RequestHandler } from './$types'

/* Every approved photo of one year, as a zip.

   STREAMED, NOT BUFFERED, and that is the whole design constraint. The 2025 set is ~54 MB of
   renditions; holding it in memory to send it would put a container that idles at ~150 MB right
   back into the OOM territory the upload path was just tuned out of, and two people tapping
   "download all" at once would double it. archiver pipes each object straight through as it is
   fetched, so peak memory is one photo plus the zip's window regardless of how many there are.

   No compression — `store` rather than `deflate`. JPEGs are already compressed; deflating them
   burns CPU on a single-vCPU container to save a percent or two, and a phone on cellular would
   rather have the bytes sooner.

   Public and unauthenticated, like the gallery it mirrors, and it reads only approved rows. */
export const GET: RequestHandler = async ({ params, request }) => {
    const year = Number.parseInt(params.year, 10)
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
        error(404, 'Not found')
    }

    const downloadable = await getApprovedPhotoKeysForYear(year)
    if (downloadable.length === 0) {
        error(404, 'No photos for that year')
    }

    const archive = new ZipArchive({ store: true })
    let current: Readable | undefined

    /* A cancelled download stops everything it holds: the archive, and the one bucket stream being
       copied into it. Otherwise that stream sits unread on a pooled socket until the idle timeout. */
    request.signal.addEventListener(
        'abort',
        () => {
            current?.destroy()
            archive.abort()
        },
        { once: true },
    )

    /* Kicked off without awaiting: the Response must be returned so bytes start flowing.

       ONE OBJECT AT A TIME. Each entry is fetched only once the previous one has been written into
       the archive ('entry'), which happens at the speed the client downloads. Appending every
       stream up front — which this did — opened a GetObject per photo at once, so one download on
       a phone held all 50 bucket sockets for minutes and no gallery thumbnail could load meanwhile.

       Errors surface on the archive's own error event, which aborts the stream — a truncated
       download is the honest outcome when the bucket fails half way, and is what a client will
       notice. */
    void (async () => {
        try {
            for (const [index, photo] of downloadable.entries()) {
                if (request.signal.aborted) {
                    return
                }
                current = await getObjectStream(photo.displayKey, request.signal)
                if (!current) {
                    continue
                }
                const name = `patterson-reunion-${year}/${String(index + 1).padStart(3, '0')}-${photo.id.slice(0, 8)}.jpg`
                /* The signal too, so a cancel mid-entry ends this wait rather than leaving it
                   pending on an archive that will never emit again. */
                const written = once(archive, 'entry', { signal: request.signal })
                archive.append(current, { name })
                await written
            }
            current = undefined
            await archive.finalize()
        } catch {
            current?.destroy()
            archive.abort()
        }
    })()

    return new Response(Readable.toWeb(archive) as ReadableStream, {
        headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="patterson-reunion-${year}-photos.zip"`,
            /* No content-length: the size is not known until the last entry is written, and a wrong
               one truncates the download. Chunked is correct here. */
            'cache-control': 'private, max-age=0, must-revalidate',
        },
    })
}
