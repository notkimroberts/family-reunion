import { error } from '@sveltejs/kit'
import { isUuid } from '$lib/general/ids'
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

   CACHING. The bytes for a given (id, variant) are immutable — the key is derived from a fresh
   uuid and never overwritten — so the object's etag identifies them permanently. Only the
   PERMISSION to serve them can change. That is why the answer is a short private max-age plus a
   304 on revalidation rather than a long public max-age: the status is re-read on every request,
   which is what keeps a rejection instant, but a repeat visitor transfers no bytes. Without the
   304 a browse of the full grid re-downloads ~4.4 MB of thumbnails every five minutes, which is
   most of what this feature would ever cost in egress.

   Do NOT make the cache public or the max-age long. A shared proxy holding a copy would keep
   serving a photo after an organiser rejected it, which removes the only protection the feature
   has. */
export const GET: RequestHandler = async ({ params, url, locals, request }) => {
    const variant = params.variant as PhotoVariant
    /* Both shape checks before any query: Postgres errors on a malformed uuid rather than returning
       nothing, which would turn a mistyped URL into a 500. */
    if (!VARIANTS.includes(variant) || !isUuid(params.id)) {
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

    /* ?download turns a view into a save. Set explicitly rather than relying on the anchor's
       `download` attribute, which iOS Safari has historically ignored for cross-document
       navigations — the header is what actually reaches Files or Photos. */
    const isDownload = url.searchParams.has('download')
    const filename = `patterson-reunion-${params.id.slice(0, 8)}.jpg`

    const headers: Record<string, string> = {
        'content-type': object.contentType,
        'cache-control': 'private, max-age=300',
        ...(object.etag ? { etag: object.etag } : {}),
        ...(object.contentLength ? { 'content-length': String(object.contentLength) } : {}),
        ...(isDownload ? { 'content-disposition': `attachment; filename="${filename}"` } : {}),
    }

    /* 304 AFTER the permission check, never before: a browser holding a valid etag for a photo that
       has since been rejected must be told 404, not "your copy is still good". */
    if (object.etag && request.headers.get('if-none-match') === object.etag) {
        await object.body.cancel()
        return new Response(null, { status: 304, headers })
    }

    /* Headers on the Response rather than via setHeaders, so the 200 and the 304 carry exactly the
       same set and neither can drift from the other. */
    return new Response(object.body, { headers })
}
