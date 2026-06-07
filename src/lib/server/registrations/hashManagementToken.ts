import { createHash, randomBytes } from 'node:crypto'

/* SHA-256 hex digest of the plaintext management token. The DB only ever stores the hash; the plaintext lives only in URLs and Stripe metadata. */
export function hashManagementToken(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex')
}

/* Generates a fresh management token alongside its storage hash. Use the plaintext in URLs/Stripe metadata; persist the hash. */
export function generateManagementToken(): { plaintext: string; hash: string } {
    const plaintext = randomBytes(32).toString('base64url')
    return { plaintext, hash: hashManagementToken(plaintext) }
}
