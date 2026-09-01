import { PutObjectCommand } from '@aws-sdk/client-s3'
import { dbg } from '$lib/server/debug'
import { getBucketClient } from './_client'

/* Writes one object. Callers pass an already-processed rendition: nothing uploaded by a visitor
   reaches this function untransformed. */
export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const { client, bucket } = getBucketClient()
    dbg.upload('put %s (%d bytes)', key, body.byteLength)
    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    )
}
