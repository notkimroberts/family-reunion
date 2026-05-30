import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, pricingTiers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const [reunionEvent] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.id, event.params.id))

    if (!reunionEvent) {
        throw error(404, 'Event not found')
    }

    const tiers = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.eventId, event.params.id))

    return { event: reunionEvent, tiers }
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

        const startDate = startDateRaw ? new Date(startDateRaw) : null
        const endDate = endDateRaw ? new Date(endDateRaw) : null

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
        const label = data.get('label') as string
        const minAge = data.get('minAge') as string
        const maxAge = data.get('maxAge') as string
        const price = data.get('price') as string

        if (!label || !minAge || !price) {
            return fail(400, { error: 'All fields required' })
        }

        dbg.admin('add_tier eventId=%s label=%s price=%s', event.params.id, label, price)

        await db.insert(pricingTiers).values({
            eventId: event.params.id,
            label,
            minAge: parseInt(minAge),
            maxAge: maxAge ? parseInt(maxAge) : null,
            priceCents: Math.round(parseFloat(price) * 100),
        })

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
        await db.delete(pricingTiers).where(eq(pricingTiers.id, tierId))
        return { success: true }
    },
}
