import type { Readable } from 'node:stream'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getBucketClient } from './_client'

/* Reads one object as a NODE stream, for piping straight into an archive.

   Separate from getObjectBody, which returns a web ReadableStream for the HTTP proxy. The two
   stream types are not interchangeable in TypeScript, and converting between them at the call site
   is noise; the SDK hands back a node Readable on this runtime, so the zip path takes it directly.
   Returns undefined when the key is absent. */
export async function getObjectStream(key: string): Promise<Readable | undefined> {
    const { client, bucket } = getBucketClient()
    try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        return (result.Body as Readable | undefined) ?? undefined
    } catch {
        return undefined
    }
}
