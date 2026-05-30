import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import { getS3Client } from './_getS3Client'

const LOCAL_UPLOAD_DIR = 'static/uploads'

export async function deleteFile(key: string): Promise<void> {
    dbg.storage('deleteFile key=%s', key)

    if (dev) {
        const filePath = join(LOCAL_UPLOAD_DIR, key)
        await unlink(filePath).catch(() => {})
        return
    }

    await getS3Client().send(
        new DeleteObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: key,
        }),
    )
}
