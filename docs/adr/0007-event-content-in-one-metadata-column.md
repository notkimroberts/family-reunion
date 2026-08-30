# ADR 0007 — Event content lives in one `metadata` column

**Status:** Accepted
**Date:** 2026-08-30

## Context

`reunion_events` had sixteen columns. Six of them — `venue`, `menu`, `drinks`, `recommended_sites`,
`recommended_activities`, `schedule` — were jsonb columns holding what `/program` displays.

None of the six was ever a predicate. Nothing filtered, ordered, grouped, joined or indexed on any of
them. Their only readers were the program page, the settings editor that writes them, two venue lines
in the confirmation email (`getConfirmationEmailData`), one venue name on the register page, and the
seed. A column earns its place by being something the database is asked a question about; these were
only ever fetched whole and rendered.

They were also the columns most likely to change shape. Every reunion has a slightly different idea
of what belongs on its program — the storefront and gallery columns that were dropped in
[ADR 0005](./0005-drop-genealogy-and-gallery-tables.md) were the same kind of thing, and each of them
cost a migration to add and another to remove. `recommended_sites` even carried a `url` field in its
TypeScript type that nothing had ever rendered.

## Decision

**Fold the six into a single `metadata` jsonb column**, `NOT NULL DEFAULT '{}'`.

```
metadata: {
  venue?:      { name, address?, description? }
  menu?:       string[]
  drinks?:     string[]
  sites?:      { name, description? }[]
  activities?: { name, description? }[]
  schedule?:   { day, time, activity }[]
}
```

Renamed on the way through, since the shape was being rewritten anyway: `recommended_sites` → `sites`,
`recommended_activities` → `activities`. Dropped: `venue.imageUrl` and the `url` on site entries,
neither of which was rendered anywhere.

**Every remaining column on the table is read as a predicate.** `status` carries the `one_open_event`
partial unique index and is what `getOpenEvent()` filters on; `year` is the ordering on `/admin` and
`/program`'s fallback; `start_date`/`end_date` drive the countdown, the date range and the email;
`registration_lock_date` gates `assertRegistrationEditable`. That is the test for whether something
belongs in a column here.

**The shape is a zod schema, not just a TypeScript type** —
`$lib/general/reunionMetadata/reunionMetadataSchema.ts`. `$type<>()` on a drizzle jsonb column is a
cast that promises nothing at runtime, so the one path that writes the column validates against the
schema first.

**The settings editor is a single JSON textarea, and it fails loudly.** The structured fields it
replaced (venue inputs, line-per-item textareas, three JSON boxes) each mapped to one column; with one
column there is one field. See Consequences for why the failure behaviour had to change with it.

**The homepage's hard-coded reunion data stays hard-coded.** `REUNION_LOCATIONS` (the Oakstop venue
card and the Kissel host hotel), `MAP_EMBED_URL`, the family stats and the family story are constants
in `$lib/general/constants` and were deliberately left there. They are not per-year content: the
story does not change, and moving the location cards into per-event data would mean re-entering two
addresses, two image paths and four URLs every reunion to get the same page back.

## Rationale

**Columns are for questions, JSON is for content.** Splitting on that line makes the table describe
what the app actually asks the database, and leaves everything else somewhere a shape change is an
edit rather than a migration.

**Migrations are the expensive direction.** Drizzle tracks applied migrations by file hash, so a
column added in haste is not cheaply removed — it is a second migration, on a table that production
has already seen. Reshaping JSON is an `UPDATE`.

**A strict schema catches the mistake the editor invites.** The owner now hand-edits JSON, so a
typo'd key is the likeliest error there is. `reunionMetadataSchema` is `.strict()`, so `{"menus": …}`
is refused by name instead of being accepted and silently dropped.

## Consequences

- **The old editor's failure mode could not survive the change, and was a latent bug regardless.** It
  caught `JSON.parse` errors and stored `null`. With three separate JSON textareas that silently
  blanked one section of the program page; with one textarea holding all six things it would have
  blanked the entire page, on a save that reported success. `parseReunionMetadata` now returns an
  error, `update_event` returns `fail(400)` and writes **nothing** — not the dates either — and the
  textarea re-renders the rejected text so the paste is not lost.
- **Two migrations, and the order is load-bearing.** `0013` adds the column and backfills it;
  `0014` drops the six originals. Running `0014` without `0013` loses the content.
- **This is not reversible.** The six columns are gone; anything not carried by the backfill —
  `venue.imageUrl`, site `url`s — is gone with them.
- Readers are `event.metadata.venue?.name`, never `event.metadata?.venue?.name`. `NOT NULL DEFAULT
'{}'` is what buys that, and it means a fixture without a `metadata` key is a broken fixture.
- Adding a program field is now: extend the zod schema, render it, extend the example in the settings
  page's `METADATA_EXAMPLE`. No migration.
- Do not add a column to `reunion_events` for something the app only displays. If it is not filtered,
  ordered or indexed on, it goes in `metadata`.
