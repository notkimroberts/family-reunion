import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import { REGISTRATION_CATEGORY_LABELS } from '$lib/utils'

export type CategoryPricing = { label: string; priceCents: number }

/* Validates every requested category is 'adult' or 'child', then resolves both to the event's configured prices. */
export async function resolveCategoryPricing(
    eventId: string,
    categories: string[],
): Promise<Record<RegistrationCategory, CategoryPricing>> {
    for (const category of categories) {
        if (category !== 'adult' && category !== 'child') {
            throw error(400, 'Invalid pricing category')
        }
    }

    const [event] = await db
        .select({
            adultPriceCents: reunionEvents.adultPriceCents,
            childPriceCents: reunionEvents.childPriceCents,
        })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    if (!event) {
        throw error(404, 'Event not found')
    }

    return {
        adult: { label: REGISTRATION_CATEGORY_LABELS.adult, priceCents: event.adultPriceCents },
        child: { label: REGISTRATION_CATEGORY_LABELS.child, priceCents: event.childPriceCents },
    }
}
