import { PutObjectCommand } from '@aws-sdk/client-s3'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import { getS3Client } from './_getS3Client'

const LOCAL_UPLOAD_DIR = 'static/uploads'

export async function uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
): Promise<string> {
    dbg.storage('uploadFile key=%s contentType=%s size=%d', key, contentType, body.length)

    if (dev) {
        const filePath = join(LOCAL_UPLOAD_DIR, key)
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, body)
        return `/uploads/${key}`
    }

    await getS3Client().send(
        new PutObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    )
    return `${env.R2_PUBLIC_URL}/${key}`
}
