import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { familyMembers, userProfiles } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const members = await db
        .select({
            id: familyMembers.id,
            name: familyMembers.name,
            birthYear: familyMembers.birthYear,
            birthMonth: familyMembers.birthMonth,
            birthDay: familyMembers.birthDay,
            userId: familyMembers.userId,
            profilePhotoUrl: userProfiles.profilePhotoUrl,
        })
        .from(familyMembers)
        .leftJoin(userProfiles, eq(familyMembers.userId, userProfiles.userId))

    return { members }
}
