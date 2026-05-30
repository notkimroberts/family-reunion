import { requireAuth } from '$lib/server/auth/guards'
import { dbg } from '$lib/server/debug'
import { getUserProfile, upsertUserProfile, softDeleteUser } from '$lib/server/users'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const profile = await getUserProfile(user.id)

    return {
        user,
        profile: profile ?? null,
    }
}

export const actions: Actions = {
    update_profile: async (event) => {
        const user = requireAuth(event)
        const data = await event.request.formData()
        const birthDate = (data.get('birthDate') as string) || null
        const phone = (data.get('phone') as string) ?? ''
        const street = (data.get('street') as string) ?? ''
        const city = (data.get('city') as string) ?? ''
        const state = (data.get('state') as string) ?? ''
        const zip = (data.get('zip') as string) ?? ''

        dbg.profile('update_profile user=%s', user.id)

        await upsertUserProfile(user.id, {
            birthDate,
            phone,
            mailingAddress: { street, city, state, zip },
        })

        return { success: true }
    },

    delete_account: async (event) => {
        const user = requireAuth(event)
        dbg.profile('delete_account user=%s', user.id)

        await softDeleteUser(user.id)

        return { deleted: true }
    },
}
