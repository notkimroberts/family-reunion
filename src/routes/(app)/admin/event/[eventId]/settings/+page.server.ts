import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { eventStatusEnum, reunionEvents, shirtSizeCategoryEnum } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createTier, deleteTier, getTiersForEvent, updateTier } from '$lib/server/tiers'
import type { PageServerLoad, Actions } from './$types'

function parseFiniteFloat(raw: string): number | null {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : null
}

function isShirtSizeCategory(
    value: string,
): value is (typeof shirtSizeCategoryEnum.enumValues)[number] {
    return (shirtSizeCategoryEnum.enumValues as readonly string[]).includes(value)
}

/* Parses and validates the add_tier/update_tier form fields shared by both actions. */
function parseTierForm(data: FormData):
    | {
          label: string
          priceCents: number
          shirtSizeCategory: (typeof shirtSizeCategoryEnum.enumValues)[number]
      }
    | { error: string } {
    const label = (data.get('label') as string)?.trim()
    const priceRaw = data.get('priceCents') as string
    const shirtSizeCategory = (data.get('shirtSizeCategory') as string)?.trim()

    const priceFloat = parseFiniteFloat(priceRaw)
    if (!label) {
        return { error: 'Tier label is required' }
    }
    if (priceFloat === null || priceFloat < 0) {
        return { error: 'Price must be a non-negative number' }
    }
    if (!isShirtSizeCategory(shirtSizeCategory)) {
        return { error: 'Invalid shirt size category' }
    }

    return { label, priceCents: Math.round(priceFloat * 100), shirtSizeCategory }
}

/* Narrows a posted string to the enum, so the update cannot be handed a status Postgres will reject
   with a 500. Mirrors isShirtSizeCategory above rather than casting. */
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
        const venueName = data.get('venueName') as string
        const venueAddress = data.get('venueAddress') as string
        const venueDescription = data.get('venueDescription') as string
        const menuRaw = data.get('menu') as string
        const drinksRaw = data.get('drinks') as string
        const scheduleRaw = data.get('schedule') as string
        const sitesRaw = data.get('recommendedSites') as string
        const activitiesRaw = data.get('recommendedActivities') as string

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

        const venue = venueName
            ? { name: venueName, address: venueAddress || '', description: venueDescription || '' }
            : null

        const menu = menuRaw ? menuRaw.split('\n').filter((l) => l.trim()) : null
        const drinks = drinksRaw ? drinksRaw.split('\n').filter((l) => l.trim()) : null

        let schedule = null
        if (scheduleRaw) {
            try {
                schedule = JSON.parse(scheduleRaw)
            } catch {
                schedule = null
            }
        }

        let recommendedSites = null
        if (sitesRaw) {
            try {
                recommendedSites = JSON.parse(sitesRaw)
            } catch {
                recommendedSites = null
            }
        }

        let recommendedActivities = null
        if (activitiesRaw) {
            try {
                recommendedActivities = JSON.parse(activitiesRaw)
            } catch {
                recommendedActivities = null
            }
        }

        await db
            .update(reunionEvents)
            .set({
                startDate,
                endDate,
                venue,
                menu,
                drinks,
                schedule,
                recommendedSites,
                recommendedActivities,
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
