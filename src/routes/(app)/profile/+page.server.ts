import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { userProfiles, registrations, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)

    const userRegistrations = await db
        .select({
            id: registrations.id,
            status: registrations.status,
            totalAmountCents: registrations.totalAmountCents,
            createdAt: registrations.createdAt,
            eventTitle: reunionEvents.title,
            eventYear: reunionEvents.year,
        })
        .from(registrations)
        .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
        .where(eq(registrations.userId, user.id))

    return {
        user,
        profile: profile ?? null,
        registrations: userRegistrations,
    }
}

export const actions: Actions = {
    update_profile: async (event) => {
        const user = requireAuth(event)
        const data = await event.request.formData()
        const birthDate = (data.get('birthDate') as string) || null
        const phone = data.get('phone') as string
        const street = data.get('street') as string
        const city = data.get('city') as string
        const state = data.get('state') as string
        const zip = data.get('zip') as string

        const [existing] = await db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, user.id))
            .limit(1)

        dbg.profile('update_profile user=%s existing=%s', user.id, !!existing)

        if (existing) {
            await db
                .update(userProfiles)
                .set({
                    birthDate,
                    phone: phone || null,
                    mailingAddress: { street, city, state, zip },
                    updatedAt: new Date(),
                })
                .where(eq(userProfiles.userId, user.id))
        } else {
            await db.insert(userProfiles).values({
                userId: user.id,
                birthDate,
                phone: phone || null,
                mailingAddress: { street, city, state, zip },
            })
        }

        return { success: true }
    },

    delete_account: async (event) => {
        const user = requireAuth(event)
        dbg.profile('delete_account user=%s', user.id)

        const [existing] = await db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, user.id))
            .limit(1)

        if (existing) {
            await db
                .update(userProfiles)
                .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(userProfiles.userId, user.id))
        } else {
            await db.insert(userProfiles).values({
                userId: user.id,
                isDeleted: true,
                deletedAt: new Date(),
            })
        }

        return { deleted: true }
    },
}
