/* Imports the recovered photo archive into the gallery.

   Run once, by hand:  bun scripts/importPhotos.ts photos-orig

   Standalone, like seed.ts and migrate.ts: $env/dynamic/private and $lib/server/db only resolve
   inside SvelteKit, so this builds its own postgres client and its own S3 client from process.env.

   The imported photos land APPROVED, unlike anything contributed through /photos/contribute. They
   are not untrusted input: they were already published on the family's previous website, which is
   where they were recovered from. Everything else about them goes through exactly the same
   pipeline — decoded, EXIF stripped, resized — so a GPS tag on a 2014 photograph is removed here
   too.

   Idempotent by filename: a second run skips whatever the first one already imported, so a batch
   that dies half way can simply be re-run. */

import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import sharp from 'sharp'
import { photos } from '../src/lib/server/db/schema'

const IMPORT_SOURCE = 'archive'
const DISPLAY_EDGE = 1600
const THUMB_EDGE = 400
const JPEG_QUALITY = 82

const directory = process.argv[2] ?? 'photos-orig'

const { DATABASE_URL, BUCKET_NAME, BUCKET_ENDPOINT, BUCKET_REGION } = process.env
const accessKeyId = process.env.BUCKET_ACCESS_KEY_ID
const secretAccessKey = process.env.BUCKET_SECRET_ACCESS_KEY

if (!DATABASE_URL) {
    throw new Error('Missing DATABASE_URL')
}
if (!BUCKET_NAME || !BUCKET_ENDPOINT || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing bucket configuration')
}

const sql = postgres(DATABASE_URL)
const db = drizzle(sql, { schema: { photos } })
const s3 = new S3Client({
    endpoint: BUCKET_ENDPOINT,
    region: BUCKET_REGION || 'auto',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
})

async function render(input: Buffer, edge: number) {
    const { data, info } = await sharp(input, { failOn: 'error' })
        .rotate()
        .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer({ resolveWithObject: true })
    return { body: data, width: info.width, height: info.height }
}

async function put(key: string, body: Buffer) {
    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: 'image/jpeg',
        }),
    )
}

const files = (await readdir(directory))
    .filter((name) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(name).toLowerCase()))
    .sort()

console.log(`importing ${files.length} photos from ${directory}`)

/* The recovered filenames are the filepicker handles, unique per photo. They go in source_key,
   which is UNIQUE, so a re-run skips what is already imported. Not in caption: that is shown to
   visitors, and 'archive:0gfLuGgMSFegY9tYMk77' is not a caption. */
const existing = new Set(
    (await db.select({ sourceKey: photos.sourceKey }).from(photos))
        .map((row) => row.sourceKey)
        .filter((key): key is string => key !== null),
)

let imported = 0
let skipped = 0
let failed = 0

for (const file of files) {
    const handle = basename(file, extname(file))
    const marker = `${IMPORT_SOURCE}:${handle}`

    if (existing.has(marker)) {
        skipped += 1
        continue
    }

    try {
        const input = await readFile(join(directory, file))
        const [display, thumb] = await Promise.all([
            render(input, DISPLAY_EDGE),
            render(input, THUMB_EDGE),
        ])

        const id = randomUUID()
        const displayKey = `photos/${id}/display.jpg`
        const thumbKey = `photos/${id}/thumb.jpg`

        await Promise.all([put(displayKey, display.body), put(thumbKey, thumb.body)])

        await db.insert(photos).values({
            id,
            status: 'approved',
            displayKey,
            thumbKey,
            width: display.width,
            height: display.height,
            /* No event: these predate every row in reunion_events, which is why event_id is
               nullable. See the table comment. */
            eventId: null,
            sourceKey: marker,
        })

        imported += 1
        if (imported % 25 === 0) {
            console.log(`  ${imported} imported…`)
        }
    } catch (error) {
        failed += 1
        console.error(`  FAILED ${file}: ${error instanceof Error ? error.message : error}`)
    }
}

console.log(`done — imported ${imported}, skipped ${skipped}, failed ${failed}`)

await sql.end()
