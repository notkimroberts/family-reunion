import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { familyMembers, relationships, userProfiles } from '$lib/server/db/schema'
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

    const rels = await db.select().from(relationships)

    return {
        members: members.map((m) => ({
            id: m.id,
            name: m.name,
            birthYear: m.birthYear,
            birthMonth: m.birthMonth,
            birthDay: m.birthDay,
            photoUrl: m.profilePhotoUrl ?? null,
        })),
        relationships: rels.map((r) => ({
            from: r.fromMemberId,
            to: r.toMemberId,
            type: r.type,
        })),
    }
}
