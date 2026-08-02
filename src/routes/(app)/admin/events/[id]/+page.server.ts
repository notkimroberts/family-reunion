import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import type { PageServerLoad, Actions } from './$types'

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

    return { event: reunionEvent }
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

    update_pricing: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const adultPriceRaw = data.get('adultPrice') as string
        const childPriceRaw = data.get('childPrice') as string

        const adultPriceFloat = parseFiniteFloat(adultPriceRaw)
        const childPriceFloat = parseFiniteFloat(childPriceRaw)
        if (adultPriceFloat === null || adultPriceFloat < 0) {
            return fail(400, { error: 'Adult price must be a non-negative number' })
        }
        if (childPriceFloat === null || childPriceFloat < 0) {
            return fail(400, { error: 'Child price must be a non-negative number' })
        }

        dbg.admin(
            'update_pricing eventId=%s adult=%s child=%s',
            event.params.id,
            adultPriceRaw,
            childPriceRaw,
        )

        await db
            .update(reunionEvents)
            .set({
                adultPriceCents: Math.round(adultPriceFloat * 100),
                childPriceCents: Math.round(childPriceFloat * 100),
                updatedAt: new Date(),
            })
            .where(eq(reunionEvents.id, event.params.id))

        return { success: true }
    },
}
