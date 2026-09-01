import { S3Client } from '@aws-sdk/client-s3'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'

let _client: S3Client | undefined
let _bucket: string | undefined

/* Lazy init, for the same reason $lib/server/db does it: Railway injects these at runtime, not at
   build time, and the bucket is unreachable while `vite build` runs. Reading them at module scope
   would fail the build.

   ADR 0005 deleted the previous version of this module along with five R2_* variables, and named
   "environment variables that must be right in production" as the cost. That cost is back and is
   accepted knowingly in ADR 0009 — so this throws a named error rather than degrading, because a
   half-configured bucket that accepts uploads and loses them is worse than one that refuses. */
export function getBucketClient(): { client: S3Client; bucket: string } {
    const {
        BUCKET_NAME,
        BUCKET_ENDPOINT,
        BUCKET_REGION,
        BUCKET_ACCESS_KEY_ID,
        BUCKET_SECRET_ACCESS_KEY,
    } = env

    if (!BUCKET_NAME || !BUCKET_ENDPOINT || !BUCKET_ACCESS_KEY_ID || !BUCKET_SECRET_ACCESS_KEY) {
        throw new Error(
            'Object storage is not configured: BUCKET_NAME, BUCKET_ENDPOINT, BUCKET_ACCESS_KEY_ID and BUCKET_SECRET_ACCESS_KEY are all required',
        )
    }

    if (!_client) {
        dbg.upload('initializing bucket client for %s', BUCKET_ENDPOINT)
        _client = new S3Client({
            endpoint: BUCKET_ENDPOINT,
            region: BUCKET_REGION || 'auto',
            credentials: {
                accessKeyId: BUCKET_ACCESS_KEY_ID,
                secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
            },
            /* Railway's buckets, like R2 and MinIO, address by path rather than by virtual host. */
            forcePathStyle: true,
        })
        _bucket = BUCKET_NAME
    }

    return { client: _client, bucket: _bucket! }
}
