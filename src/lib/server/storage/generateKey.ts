import { dbg } from '$lib/server/debug'

// Builds a unique storage key as `prefix/uuid.ext` from the original filename's extension.
export function generateKey(prefix: string, filename: string): string {
    const ext = filename.split('.').pop()
    const id = crypto.randomUUID()
    const key = `${prefix}/${id}.${ext}`
    dbg.storage('generateKey prefix=%s -> %s', prefix, key)
    return key
}
