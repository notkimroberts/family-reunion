import { S3Client } from '@aws-sdk/client-s3'
import { env } from '$env/dynamic/private'

// Creates a new S3Client pointed at the Cloudflare R2 endpoint using runtime env credentials.
export function getS3Client(): S3Client {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID!,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
        },
    })
}
