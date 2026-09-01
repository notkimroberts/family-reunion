/* Bounds on a contributed photo.

   These are the whole of the input validation available to an endpoint that carries no credential,
   so they are enforced server-side BEFORE the bytes are decoded — a 500 MB upload must be refused
   on its Content-Length, not after sharp has tried to hold it in memory.

   PHOTO_DISPLAY_EDGE is measured, not guessed: across the 290 recovered archive photos, 1600px on
   the longest edge yields ~186 KB per image and ~54 MB for the whole gallery, against 1.2 GB of
   originals. 2048px would be ~88 MB for detail nobody views on a phone. */
export const PHOTO_MAX_UPLOAD_BYTES = 15 * 1024 * 1024
export const PHOTO_MAX_PER_REQUEST = 10
export const PHOTO_DISPLAY_EDGE = 1600
export const PHOTO_THUMB_EDGE = 400
export const PHOTO_JPEG_QUALITY = 82
/* Anything sharp reports outside this is not a photograph a family took. Guards against decompression
   bombs, which are small on disk and enormous in memory. */
export const PHOTO_MAX_PIXELS = 80_000_000
