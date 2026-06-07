import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const [event] = await db
        .select({
            externalShopUrl: reunionEvents.externalShopUrl,
            shopProducts: reunionEvents.shopProducts,
            shopActive: reunionEvents.shopActive,
        })
        .from(reunionEvents)
        .where(and(eq(reunionEvents.status, 'open'), eq(reunionEvents.shopActive, true)))
        .limit(1)

    if (!event || !event.externalShopUrl) {
        return { config: undefined }
    }

    return {
        config: {
            externalShopUrl: event.externalShopUrl,
            products: event.shopProducts,
        },
    }
}
