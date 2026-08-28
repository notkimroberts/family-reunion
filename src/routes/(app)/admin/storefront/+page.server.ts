import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, type StorefrontProduct } from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireOwner(event)
    const [openEvent] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .limit(1)
    return { event: openEvent ?? undefined }
}

export const actions: Actions = {
    default: async (event) => {
        requireOwner(event)
        const data = await event.request.formData()
        const externalShopUrl = data.get('externalShopUrl') as string
        const productsRaw = data.get('products') as string
        const isActive = data.get('isActive') === 'on'

        if (!externalShopUrl?.trim()) {
            return fail(400, { error: 'Shop URL required' })
        }

        let products: StorefrontProduct[] | null = null
        if (productsRaw?.trim()) {
            try {
                products = JSON.parse(productsRaw)
            } catch {
                return fail(400, { error: 'Invalid products JSON' })
            }
        }

        const [openEvent] = await db
            .select({ id: reunionEvents.id })
            .from(reunionEvents)
            .where(eq(reunionEvents.status, 'open'))
            .limit(1)

        if (!openEvent) {
            return fail(400, { error: 'No open event to attach the shop to' })
        }

        await db
            .update(reunionEvents)
            .set({
                externalShopUrl: externalShopUrl.trim(),
                shopProducts: products,
                shopActive: isActive,
                updatedAt: new Date(),
            })
            .where(eq(reunionEvents.id, openEvent.id))

        return { success: true }
    },
}
