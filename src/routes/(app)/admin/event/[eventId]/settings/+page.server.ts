import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { eventStatusEnum, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createTier, deleteTier, getTiersForEvent, updateTier } from '$lib/server/tiers'
import type { PageServerLoad, Actions } from './$types'
import { parseReunionMetadata } from './parseReunionMetadata'

function parseFiniteFloat(raw: string): number | null {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : null
}

/* A datetime-local field that is allowed to be empty, but not allowed to be wrong.

   Blank means "clear this date" and is a legitimate save. Anything unparseable is refused, which is a
   change: update_event used to leave a bad value as null and write it, so a typo in Start CLEARED the
   start date and reported success. The countdown on the home page keys off that column, so the failure
   was silent and off-screen. */
function parseOptionalDate(
    raw: FormDataEntryValue | null,
): { date: Date | null } | { error: string } {
    const trimmed = String(raw ?? '').trim()
    if (!trimmed) {
        return { date: null }
    }
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) {
        return { error: `"${trimmed}" is not a date we can read.` }
    }
    return { date: parsed }
}

/* Parses and validates the add_tier/update_tier form fields shared by both actions.

   A tier is a label and a price. It used to carry an adult/child shirt-size flag as well, which no
   size list ever read — the label is what tells an organiser which shirts a tier means, and the order
   sheet groups by it. */
function parseTierForm(data: FormData):
    | {
          label: string
          priceCents: number
      }
    | { error: string } {
    const label = (data.get('label') as string)?.trim()
    const priceRaw = data.get('priceCents') as string

    const priceFloat = parseFiniteFloat(priceRaw)
    if (!label) {
        return { error: 'Tier label is required' }
    }
    if (priceFloat === null || priceFloat < 0) {
        return { error: 'Price must be a non-negative number' }
    }

    return { label, priceCents: Math.round(priceFloat * 100) }
}

/* Narrows a posted string to the enum, so the update cannot be handed a status Postgres will reject
   with a 500. */
function isEventStatus(value: string): value is (typeof eventStatusEnum.enumValues)[number] {
    return (eventStatusEnum.enumValues as readonly string[]).includes(value)
}

export const load: PageServerLoad = async (event) => {
    requireOwner(event)

    const [reunionEvent] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.id, event.params.eventId))

    if (!reunionEvent) {
        throw error(404, 'Event not found')
    }

    const tiers = await getTiersForEvent(reunionEvent.id)

    return { event: reunionEvent, tiers }
}

export const actions: Actions = {
    /* The dates, and NOTHING else.

       This and update_program were one `update_event` action writing both the dates and the whole
       metadata object in a single db.update. That coupling was load-bearing while they shared a card:
       the update cleared any column the POST omitted, so a second Save on the same row of data would
       have blanked whatever it did not carry.

       Splitting the card required splitting the action, not the other way round. Each now sets only its
       own columns, so a form that never mentions metadata cannot touch it. The safety property that
       mattered — a rejected paste must not leave the dates saved and the program stale — survives
       trivially, because the dates are no longer part of that POST at all. */
    update_dates: async (event) => {
        requireOwner(event)
        dbg.admin('update_dates id=%s', event.params.eventId)
        const data = await event.request.formData()

        const startDate = parseOptionalDate(data.get('startDate'))
        const endDate = parseOptionalDate(data.get('endDate'))

        if ('error' in startDate) {
            return fail(400, { error: `Start date: ${startDate.error}` })
        }
        if ('error' in endDate) {
            return fail(400, { error: `End date: ${endDate.error}` })
        }

        /* Caught here rather than left to the reader of /program, where a reversed range renders a
           countdown to a date already past and a range that reads backwards. Equal is allowed — a
           one-session reunion is legitimate. */
        if (startDate.date && endDate.date && endDate.date < startDate.date) {
            return fail(400, { error: 'The end date is before the start date.' })
        }

        await db
            .update(reunionEvents)
            .set({ startDate: startDate.date, endDate: endDate.date, updatedAt: new Date() })
            .where(eq(reunionEvents.id, event.params.eventId))

        return { success: true }
    },

    /* The program content, and nothing else — see update_dates.

       Parsed before anything is written, and a failure writes NOTHING. The raw text comes back with the
       error so the owner does not lose what they typed. */
    update_program: async (event) => {
        requireOwner(event)
        dbg.admin('update_program id=%s', event.params.eventId)
        const data = await event.request.formData()

        const metadataRaw = (data.get('metadata') as string) ?? ''

        const parsedMetadata = parseReunionMetadata(metadataRaw)
        if ('error' in parsedMetadata) {
            return fail(400, { error: parsedMetadata.error, metadata: metadataRaw })
        }

        await db
            .update(reunionEvents)
            .set({ metadata: parsedMetadata.metadata, updatedAt: new Date() })
            .where(eq(reunionEvents.id, event.params.eventId))

        return { success: true }
    },

    update_lock_date: async (event) => {
        requireOwner(event)
        const data = await event.request.formData()
        const raw = (data.get('registrationLockDate') as string)?.trim()

        let registrationLockDate: Date | null = null
        if (raw) {
            const d = new Date(raw)
            if (Number.isNaN(d.getTime())) {
                return fail(400, { error: 'Invalid lock date' })
            }
            registrationLockDate = d
        }

        dbg.admin('update_lock_date eventId=%s date=%s', event.params.eventId, raw)

        await db
            .update(reunionEvents)
            .set({ registrationLockDate, updatedAt: new Date() })
            .where(eq(reunionEvents.id, event.params.eventId))

        return { success: true }
    },

    /* Opens, closes, drafts or archives the year — the control that used to live on
       /admin/setup/events, moved here because the status belongs to the event and this is the event's
       page. It was the last reason that route existed.

       The friendly 23505 handling is the point: `one_open_event` is a partial unique index, so opening a
       second year is a database error rather than a validation failure, and without this the organiser
       gets a 500 for a mistake with an obvious remedy. */
    update_status: async (event) => {
        requireOwner(event)

        const data = await event.request.formData()
        const status = String(data.get('status') ?? '')

        if (!isEventStatus(status)) {
            return fail(400, { error: 'Unknown status' })
        }

        dbg.admin('update_status eventId=%s status=%s', event.params.eventId, status)

        try {
            await db
                .update(reunionEvents)
                .set({ status, updatedAt: new Date() })
                .where(eq(reunionEvents.id, event.params.eventId))
        } catch (err) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'code' in err &&
                (err as { code?: string }).code === '23505'
            ) {
                return fail(409, {
                    error: 'Another year is already open. Close that one first.',
                })
            }
            throw err
        }

        return { success: true }
    },

    add_tier: async (event) => {
        requireOwner(event)
        const data = await event.request.formData()
        const parsed = parseTierForm(data)
        if ('error' in parsed) {
            return fail(400, { error: parsed.error })
        }

        await createTier({
            eventId: event.params.eventId,
            ...parsed,
        })

        return { success: true }
    },

    update_tier: async (event) => {
        requireOwner(event)
        const data = await event.request.formData()
        const tierId = data.get('tierId') as string
        const parsed = parseTierForm(data)
        if ('error' in parsed) {
            return fail(400, { error: parsed.error })
        }

        await updateTier(tierId, parsed)

        return { success: true }
    },

    delete_tier: async (event) => {
        requireOwner(event)
        const data = await event.request.formData()
        const tierId = data.get('tierId') as string

        await deleteTier(tierId)

        return { success: true }
    },
}
