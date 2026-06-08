import { error, fail } from '@sveltejs/kit'
import { eq, sql } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, type PricingTier } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import type { PageServerLoad, Actions } from './$types'

function parseFiniteInt(raw: string): number | null {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
}

function parseFiniteFloat(raw: string): number | null {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : null
}

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const [reunionEvent] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.id, event.params.id))

    if (!reunionEvent) {
        throw error(404, 'Event not found')
    }

    const tiers = [...reunionEvent.pricingTiers].sort((a, b) => a.minAge - b.minAge)

    return { event: reunionEvent, tiers }
}

/* Mutates pricingTiers JSONB inside a transaction with FOR UPDATE so concurrent admin edits
   serialize instead of clobbering each other (last-writer-wins on a JSONB read-modify-write). */
async function mutateTiers(
    eventId: string,
    f: (current: PricingTier[]) => PricingTier[],
): Promise<void> {
    await db.transaction(async (tx) => {
        const [row] = await tx
            .select({ pricingTiers: reunionEvents.pricingTiers })
            .from(reunionEvents)
            .where(eq(reunionEvents.id, eventId))
            .for('update')
            .limit(1)
        if (!row) {
            throw error(404, 'Event not found')
        }
        const next = f(row.pricingTiers)
        await tx
            .update(reunionEvents)
            .set({ pricingTiers: next, updatedAt: new Date() })
            .where(eq(reunionEvents.id, eventId))
    })
}

export const actions: Actions = {
    update_event: async (event) => {
        requireAdmin(event)
        dbg.admin('update_event id=%s', event.params.id)
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
            .where(eq(reunionEvents.id, event.params.id))

        return { success: true }
    },

    add_tier: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const label = (data.get('label') as string)?.trim()
        const minAgeRaw = data.get('minAge') as string
        const maxAgeRaw = data.get('maxAge') as string
        const priceRaw = data.get('price') as string

        if (!label || !minAgeRaw || !priceRaw) {
            return fail(400, { error: 'All fields required' })
        }

        const minAge = parseFiniteInt(minAgeRaw)
        const maxAge = maxAgeRaw ? parseFiniteInt(maxAgeRaw) : null
        const priceFloat = parseFiniteFloat(priceRaw)
        if (minAge === null || minAge < 0 || (maxAgeRaw && maxAge === null)) {
            return fail(400, { error: 'Min/max age must be a number' })
        }
        if (priceFloat === null || priceFloat < 0) {
            return fail(400, { error: 'Price must be a non-negative number' })
        }
        if (maxAge !== null && maxAge < minAge) {
            return fail(400, { error: 'Max age must be at least min age' })
        }

        dbg.admin('add_tier eventId=%s label=%s price=%s', event.params.id, label, priceRaw)

        const newTier: PricingTier = {
            id: crypto.randomUUID(),
            label,
            minAge,
            maxAge,
            priceCents: Math.round(priceFloat * 100),
        }

        await mutateTiers(event.params.id, (current) => [...current, newTier])
        return { success: true }
    },

    delete_tier: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const tierId = data.get('tierId') as string
        if (!tierId) {
            return fail(400, { error: 'Missing tier ID' })
        }

        dbg.admin('delete_tier id=%s', tierId)

        await mutateTiers(event.params.id, (current) => current.filter((t) => t.id !== tierId))
        return { success: true }
    },
}
