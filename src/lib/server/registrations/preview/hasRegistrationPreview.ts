import type { Cookies } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { REGISTRATION_PREVIEW_COOKIE } from './REGISTRATION_PREVIEW_COOKIE'
import { isRegistrationPreviewKey } from './isRegistrationPreviewKey'

/* Whether this browser holds the current preview key. Read on every request rather than trusted
   from the cookie alone, so changing or deleting REGISTRATION_PREVIEW_KEY on Railway ends every
   preview at once. */
export function hasRegistrationPreview(cookies: Cookies): boolean {
    return isRegistrationPreviewKey(
        cookies.get(REGISTRATION_PREVIEW_COOKIE),
        env.REGISTRATION_PREVIEW_KEY,
    )
}
