import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import {
    familyMembers,
    familyMemberEdits,
    relationships,
    userProfiles,
} from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

const VALID_RELATIONSHIP_TYPES = [
    'parent',
    'child',
    'spouse',
    'sibling',
    'grandparent',
    'grandchild',
    'aunt_uncle',
    'niece_nephew',
    'cousin',
] as const

type RelType = (typeof VALID_RELATIONSHIP_TYPES)[number]

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

export const actions: Actions = {
    addMember: async ({ request }) => {
        const data = await request.formData()
        const name = (data.get('name') as string)?.trim()
        const birthDate = data.get('birthDate') as string | null
        const editorName = (data.get('editorName') as string)?.trim()
        const editorEmail = (data.get('editorEmail') as string)?.trim().toLowerCase()
        const relationshipType = (data.get('relationshipType') as string) || null
        const relatedMemberId = (data.get('relatedMemberId') as string) || null

        if (!name) {
            return fail(400, { error: 'Name is required' })
        }
        if (!editorName || !editorEmail) {
            return fail(400, { error: 'Your name and email are required' })
        }
        if ((relationshipType && !relatedMemberId) || (!relationshipType && relatedMemberId)) {
            return fail(400, { error: 'Both relationship type and member are required together' })
        }
        if (relationshipType && !VALID_RELATIONSHIP_TYPES.includes(relationshipType as RelType)) {
            return fail(400, { error: 'Invalid relationship type' })
        }

        let birthYear: number | null = null
        let birthMonth: number | null = null
        let birthDay: number | null = null

        if (birthDate) {
            const parts = birthDate.split('-').map(Number)
            birthYear = parts[0] ?? null
            birthMonth = parts[1] ?? null
            birthDay = parts[2] ?? null
        }

        const [member] = await db
            .insert(familyMembers)
            .values({ name, birthYear, birthMonth, birthDay })
            .returning()

        await db.insert(familyMemberEdits).values({
            memberId: member.id,
            editorName,
            editorEmail,
            snapshot: { name, birthYear, birthMonth, birthDay },
        })

        if (relationshipType && relatedMemberId) {
            await db.insert(relationships).values({
                fromMemberId: member.id,
                toMemberId: relatedMemberId,
                type: relationshipType as RelType,
                createdByUserId: editorEmail,
            })
        }

        return { success: true }
    },
}
