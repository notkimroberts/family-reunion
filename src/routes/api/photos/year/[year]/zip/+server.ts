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
export const GET: RequestHandler = async ({ params }) => {
    const year = Number.parseInt(params.year, 10)
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
        error(404, 'Not found')
    }

    const downloadable = await getApprovedPhotoKeysForYear(year)
    if (downloadable.length === 0) {
        error(404, 'No photos for that year')
    }

    const archive = new ZipArchive({ store: true })

    /* Kicked off without awaiting: the Response must be returned so bytes start flowing, and the
       appends resolve into the archive as it drains. Errors surface on the archive's own error
       event, which aborts the stream — a truncated download is the honest outcome when the bucket
       fails half way, and is what a client will notice. */
    void (async () => {
        try {
            for (const [index, photo] of downloadable.entries()) {
                const body = await getObjectStream(photo.displayKey)
                if (!body) {
                    continue
                }
                const name = `patterson-reunion-${year}/${String(index + 1).padStart(3, '0')}-${photo.id.slice(0, 8)}.jpg`
                archive.append(body, { name })
            }
            await archive.finalize()
        } catch {
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
