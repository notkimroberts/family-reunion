import { createHash, timingSafeEqual } from 'node:crypto'

/* A shorter key could be guessed; refusing it means a weak value on Railway turns the preview off
   instead of opening registration to anyone who tries a few words. */
const MIN_PREVIEW_KEY_LENGTH = 32

const digest = (value: string) => createHash('sha256').update(value).digest()

/* Whether `candidate` is the configured preview key. False when either is missing or the configured
   key is too short. Compares digests with timingSafeEqual, so the time taken says nothing about how
   much of a guess was right. */
export function isRegistrationPreviewKey(
    candidate: string | undefined,
    configuredKey: string | undefined,
): boolean {
    if (!candidate || !configuredKey || configuredKey.length < MIN_PREVIEW_KEY_LENGTH) {
        return false
    }
    return timingSafeEqual(digest(candidate), digest(configuredKey))
}
