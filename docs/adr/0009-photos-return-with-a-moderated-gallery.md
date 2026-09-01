# ADR 0009 — Photos return, as a public gallery with a moderation gate

**Status:** Accepted
**Date:** 2026-09-01
**Amends:** [ADR 0005](./0005-drop-genealogy-and-gallery-tables.md)

## Context

[ADR 0005](./0005-drop-genealogy-and-gallery-tables.md) deleted the photo gallery, the `photos` table
and the whole Cloudflare R2 storage layer three days ago. It closed with: _"Nothing in the app uploads
a file. If that changes, it needs a new storage module and its own ADR."_ This is that ADR.

Two of its premises have expired. One has not, and is being overturned deliberately rather than
quietly.

**"Launch is imminent" — expired.** Launch happened. The reunion is July 2027, eleven months out. The
argument that a bucket is one more thing to misconfigure on launch day no longer holds; there is now
the most slack there will ever be.

**"Photos are a solved problem elsewhere" — expired.** It was true when the alternative was a shared
album on a service the family already uses. It stopped being true when **290 photographs, 1.2 GB, were
recovered from the family's previous website** — a Wix page serving images through filepicker, whose
signed URLs expire hourly. Those photographs existed in exactly one place, behind a host nobody
controls. A shared album does not solve the problem of getting them somewhere durable; it is the
problem restated.

**"The R2 surface was the real cost" — still true, and overridden.** Object storage, an S3 SDK and
four environment variables that must be right in production are all coming back. Nothing about that
got cheaper. It is accepted because the alternative was worse, not because the objection was wrong.

The sizing is measured across the recovered archive rather than estimated:

|                           | total    | average           |
| ------------------------- | -------- | ----------------- |
| Originals as recovered    | 1,240 MB | 4.28 MB / 10.2 MP |
| Renditions at 1600px, q82 | ~54 MB   | ~186 KB           |
| Thumbnails at 400px       | ~4 MB    | ~15 KB            |

## Decision

**A public gallery at `/photos`, with public contribution and organiser moderation.**

- **Anyone may upload, with no credential.** No token, no passcode, no account.
- **Nothing is publicly visible until an organiser approves it.** Every contributed row is written
  `pending`. The public gallery query filters on `approved`, and the byte proxy re-reads the status on
  every request.
- **Storage is a Railway object storage bucket**, private. `$lib/server/storage` returns, along with
  `@aws-sdk/client-s3` and four `BUCKET_*` variables.
- **Uploads are processed and discarded.** `sharp` decodes, strips all metadata, and writes a 1600px
  display rendition and a 400px thumbnail. The uploaded bytes are never stored.
- **`photos.event_id` is nullable**, mirroring `donations.event_id`.
- **The moderation queue is a fourth `?view=` lens** on the registrations page, not a route.
- **The 290 recovered photographs are imported `approved`** by `scripts/importPhotos.ts`.

## Rationale

**Open upload was chosen over a token gate, against the recommendation on this page.** Gating on the
management token would have restricted contributors to people who registered — a real allowlist, no
new auth concept, `getRegistrationByToken` already written. It was rejected because extended family
who never registered are exactly the people most likely to hold the old photographs. That is a
defensible trade, but it is a trade: the app now has an unauthenticated write endpoint, which is a
thing that attracts abuse rather than a thing that might.

**So review-before-publish is not a nicety here, it is the entire protection.** With no credential
there is no account to suspend and no token to revoke. Whoever weakens the moderation gate later —
auto-approving "trusted" uploads, caching the proxy publicly, listing pending photos anywhere — removes
the only control this feature has. Three checks stand in for the missing credential and none of them
is optional:

1. **The decode is the validation.** A `Content-Type` header is supplied by the caller; that libvips
   parses the bytes as a raster image is not. SVG is refused by name — it is a document that can carry
   script, and the one "image" that is dangerous to serve back verbatim.
2. **All metadata is stripped.** Phone photographs of children carry the GPS coordinates of family
   homes. There is a test asserting the stripping rather than trusting sharp's default, because that
   default changing silently would publish them.
3. **A per-IP rate limit**, in-process, is the only throttle that exists.

**The bucket was chosen over static files, also against the recommendation.** At 58 MB the whole
serving set would fit in the repo, needing no SDK, no credentials and no runtime failure mode. The
bucket earns its place because the gallery grows: a fixed archive would not need one, and a gallery
that accepts uploads cannot ship its contents in a deploy.

**The bucket stays private and the app proxies every byte.** Railway exposes no public URL for bucket
objects, but even if it did, a public bucket would serve `pending` photographs to anyone who guessed a
key, and rejecting a photograph would not make it unreachable. Proxying is what lets the status be
re-checked per request. The cache header is `private, max-age=300` for the same reason — a long public
`Cache-Control` would let a shared proxy keep serving something after it was rejected.

**`event_id` is nullable because the archive predates every reunion event row.** The 290 photographs
belong to no year in `reunion_events`, and a photograph contributed between reunions is recorded rather
than refused. This is the reasoning already applied to `donations.event_id` in
[ADR 0008](./0008-contact-stays-on-the-registration.md)'s neighbourhood, and it is why the moderation
lens is deliberately **not** filtered by `params.eventId`: a queue scoped to a year would hide exactly
the rows most needing a decision.

## Consequences

- **CONTEXT.md's ban on the word "photo" is lifted**, in the same commit. **Family member** and
  **relationship** remain non-terms — ADR 0005's genealogy half stands, and this amends only the
  gallery half.
- `BUCKET_NAME`, `BUCKET_ENDPOINT`, `BUCKET_ACCESS_KEY_ID`, `BUCKET_SECRET_ACCESS_KEY` (and optionally
  `BUCKET_REGION`) must be set on Railway. The storage client throws a named error when they are
  missing rather than degrading: a half-configured bucket that accepts uploads and loses them is worse
  than one that refuses.
- **`BODY_SIZE_LIMIT` must be raised on Railway.** adapter-node defaults it to `512K`
  (`files/handler.js:25`), which silently rejects the average phone photograph. The dev server has no
  such limit, so this fails only in production — the exact shape of bug this note exists to prevent.
- `photos.display_key` and `photos.thumb_key` are the only pointers to the bucket objects, as
  `photos.r2_key` was before. `deletePhoto` removes the objects **first**, then the row. Deleting rows
  by any other route orphans bytes nothing can enumerate — which is what happened to the R2 bucket.
- `sharp` adds a native binary to the build. It must build in the Railway image.
- The recovered originals stay **out of the repo** (`photos-orig/` is gitignored). They are cold
  archive; the app only ever needs the renditions.
- **Six of the original 296 could not be recovered.** They returned HTTP 400 on the live site too, so
  they were already broken before any of this. Not a gap to chase.
- The rate limiter is in-process, so it resets on deploy and does not coordinate across replicas. With
  one container that is honest; a second replica doubles the effective limit.
