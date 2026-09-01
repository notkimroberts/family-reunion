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
/* Anything sharp reports outside this is not a photograph a family took, and is refused before a
   single pixel is decoded. Guards against decompression bombs, which are small on disk and enormous
   in memory.

   30 MP, not 80. This is a MEMORY bound, not a quality one: libvips holds the decoded bitmap, so
   30 MP is ~90 MB of RAM and 80 MP was ~240 MB — on a container that idles at ~150 MB, the latter
   is an OOM waiting for one hostile or merely enormous upload, and an OOM is an outage. 30 MP is
   comfortably above every phone (48 MP sensors bin to 12) and every consumer DSLR the family is
   likely to own. Checked against the recovered archive before it was lowered: 10.2 MP average,
   24.5 MP at the very largest, none above 30. */
export const PHOTO_MAX_PIXELS = 30_000_000
