import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'

const LOCAL_UPLOAD_DIR = 'static/uploads'

function getS3Client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID!,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
        },
    })
}

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

export function generateKey(prefix: string, filename: string): string {
    const ext = filename.split('.').pop()
    const id = crypto.randomUUID()
    const key = `${prefix}/${id}.${ext}`
    dbg.storage('generateKey prefix=%s -> %s', prefix, key)
    return key
}
