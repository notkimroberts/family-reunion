import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { storefrontConfig } from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)
    const [config] = await db.select().from(storefrontConfig).limit(1)
    return { config: config ?? null }
}

export const actions: Actions = {
    default: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const externalShopUrl = data.get('externalShopUrl') as string
        const productsRaw = data.get('products') as string
        const isActive = data.get('isActive') === 'on'

        if (!externalShopUrl?.trim()) return fail(400, { error: 'Shop URL required' })

        let products = null
        if (productsRaw?.trim()) {
            try {
                products = JSON.parse(productsRaw)
            } catch {
                return fail(400, { error: 'Invalid products JSON' })
            }
        }

        const [existing] = await db.select().from(storefrontConfig).limit(1)

        if (existing) {
            await db
                .update(storefrontConfig)
                .set({ externalShopUrl, products, isActive, updatedAt: new Date() })
                .where(eq(storefrontConfig.id, existing.id))
        } else {
            await db.insert(storefrontConfig).values({
                externalShopUrl,
                products,
                isActive,
            })
        }

        return { success: true }
    },
}
