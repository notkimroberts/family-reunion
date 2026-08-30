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
    update_event: async (event) => {
        requireOwner(event)
        dbg.admin('update_event id=%s', event.params.eventId)
        const data = await event.request.formData()

        const startDateRaw = data.get('startDate') as string
        const endDateRaw = data.get('endDate') as string
        const metadataRaw = (data.get('metadata') as string) ?? ''

        /* Parsed before anything is written, and a failure writes NOTHING — not the dates either.
           One card, one Save, one outcome: a rejected paste must not leave the dates saved and the
           program content stale, with the alert implying neither went through. The raw text comes
           back with the error so the owner does not lose what they typed. */
        const parsedMetadata = parseReunionMetadata(metadataRaw)
        if ('error' in parsedMetadata) {
            return fail(400, { error: parsedMetadata.error, metadata: metadataRaw })
        }

        let startDate: Date | null = null
        if (startDateRaw) {
            const d = new Date(startDateRaw)
            if (!Number.isNaN(d.getTime())) {
                startDate = d
            }
        }
        let endDate: Date | null = null
        if (endDateRaw) {
            const d = new Date(endDateRaw)
            if (!Number.isNaN(d.getTime())) {
                endDate = d
            }
        }

        await db
            .update(reunionEvents)
            .set({
                startDate,
                endDate,
                metadata: parsedMetadata.metadata,
                updatedAt: new Date(),
            })
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
