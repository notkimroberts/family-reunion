import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getBucketClient } from './_client'

export type StoredObject = {
    body: ReadableStream
    contentType: string
    contentLength: number | undefined
    etag: string | undefined
}

/* Reads one object back for the byte proxy.

   The bucket is private and stays private: Railway's object storage exposes no public URL, and
   even if it did, a public bucket would serve `pending` photos to anyone who guessed a key. Every
   byte therefore goes through the app, which is what lets the proxy re-check the moderation status
   on each request. Returns undefined when the key is absent.

   The etag comes back so the proxy can answer 304. Renditions are immutable — a key is derived
   from a fresh uuid and never overwritten — so the etag is a permanent identifier for those bytes;
   only the PERMISSION to serve them can change. */
export async function getObjectBody(key: string): Promise<StoredObject | undefined> {
    const { client, bucket } = getBucketClient()
    try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        if (!result.Body) {
            return undefined
        }
        return {
            body: result.Body.transformToWebStream(),
            contentType: result.ContentType ?? 'application/octet-stream',
            contentLength: result.ContentLength,
            etag: result.ETag,
        }
    } catch {
        return undefined
    }
}
