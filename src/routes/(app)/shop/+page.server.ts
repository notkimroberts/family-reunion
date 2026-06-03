import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { storefrontConfig } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const [config] = await db
        .select()
        .from(storefrontConfig)
        .where(eq(storefrontConfig.isActive, true))
        .limit(1)
    return { config: config ?? undefined }
}
