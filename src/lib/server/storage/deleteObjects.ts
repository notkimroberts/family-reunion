import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { dbg } from '$lib/server/debug'
import { getBucketClient } from './_client'

/* Removes objects, tolerating ones that are already gone.

   Deliberately does not fail the caller on a missing key. Deleting a photo removes the row and the
   objects, and a half-done delete that refuses to retry leaves a row pointing at nothing — the row
   is the only record that the objects exist, so the row must always be removable. */
export async function deleteObjects(keys: string[]): Promise<void> {
    const { client, bucket } = getBucketClient()
    await Promise.all(
        keys.map(async (key) => {
            try {
                await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
                dbg.upload('deleted %s', key)
            } catch (error) {
                dbg.upload('delete failed for %s: %o', key, error)
            }
        }),
    )
}
