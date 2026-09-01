import { error } from '@sveltejs/kit'
import { getPhotoKey, getServablePhotoKey, type PhotoVariant } from '$lib/server/photos'
import { getObjectBody } from '$lib/server/storage'
import type { RequestHandler } from './$types'

const VARIANTS: PhotoVariant[] = ['display', 'thumb']

/* Streams one photo's bytes.

   Sits OUTSIDE the (app) route group, so isPublicPath does not cover it and it carries its own
   check — the same arrangement as the Stripe and Resend webhooks. The check is per request and
   reads the current status: getServablePhotoKey returns nothing for a photo that is pending or
   rejected, so un-approving a photo makes it unreachable immediately rather than merely unlisted.

   An admin gets the unfiltered key, because the moderation queue has to render the thing being
   moderated.

   The cache header is deliberately private and short for that reason. A public, long-lived
   Cache-Control would let a CDN or a shared proxy keep serving a photo after it was rejected,
   which would quietly undo the only protection this feature has. Renditions are ~186 KB and the
   app serves one container; correctness wins over the byte saving here. */
export const GET: RequestHandler = async ({ params, locals, setHeaders }) => {
    const variant = params.variant as PhotoVariant
    if (!VARIANTS.includes(variant)) {
        error(404, 'Not found')
    }

    const isAdmin = locals.user?.role === 'admin'
    const key = isAdmin
        ? await getPhotoKey(params.id, variant)
        : await getServablePhotoKey(params.id, variant)

    if (!key) {
        error(404, 'Not found')
    }

    const object = await getObjectBody(key)
    if (!object) {
        error(404, 'Not found')
    }

    setHeaders({
        'content-type': object.contentType,
        'cache-control': 'private, max-age=300',
        ...(object.contentLength ? { 'content-length': String(object.contentLength) } : {}),
    })

    return new Response(object.body)
}
