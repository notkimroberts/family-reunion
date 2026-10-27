import { createHmac } from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERIOD_SECONDS = 30
const DIGITS = 6

/* RFC 6238, what an authenticator app computes from the otpauth:// secret. */
export function totp(base32Secret: string, at: number = Date.now()): string {
    const bits = [...base32Secret.replace(/=+$/, '').toUpperCase()]
        .map((char) => BASE32_ALPHABET.indexOf(char).toString(2).padStart(5, '0'))
        .join('')
    const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)))
    const counter = Buffer.alloc(8)
    counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / PERIOD_SECONDS)))
    const hmac = createHmac('sha1', key).update(counter).digest()
    const offset = hmac[hmac.length - 1] & 0xf
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS
    return code.toString().padStart(DIGITS, '0')
}
