import { fail } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { familyMembers, relationships } from '$lib/server/db/schema'
import { validatePartialBirthDate } from '$lib/utils/age/validatePartialBirthDate'
import type { PageServerLoad, Actions } from './$types'
import { VALID_RELATIONSHIP_TYPES, type RelType } from './types'

export const load: PageServerLoad = async () => {
    const members = await db
        .select({
            id: familyMembers.id,
            name: familyMembers.name,
            birthYear: familyMembers.birthYear,
            birthMonth: familyMembers.birthMonth,
            birthDay: familyMembers.birthDay,
        })
        .from(familyMembers)

    const rels = await db.select().from(relationships)

    return {
        members,
        relationships: rels.map((r) => ({
            from: r.fromMemberId,
            to: r.toMemberId,
            type: r.type,
        })),
    }
}

export const actions: Actions = {
    addMember: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const name = (data.get('name') as string)?.trim()
        const birthYearRaw = (data.get('birthYear') as string)?.trim()
        const birthMonthRaw = (data.get('birthMonth') as string)?.trim()
        const birthDayRaw = (data.get('birthDay') as string)?.trim()
        const relationshipType = (data.get('relationshipType') as string) || undefined
        const relatedMemberId = (data.get('relatedMemberId') as string) || undefined

        if (!name) {
            return fail(400, { error: 'Name is required' })
        }
        if ((relationshipType && !relatedMemberId) || (!relationshipType && relatedMemberId)) {
            return fail(400, { error: 'Both relationship type and member are required together' })
        }
        if (relationshipType && !VALID_RELATIONSHIP_TYPES.includes(relationshipType as RelType)) {
            return fail(400, { error: 'Invalid relationship type' })
        }

        const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null
        const birthMonth = birthMonthRaw ? parseInt(birthMonthRaw, 10) : null
        const birthDay = birthDayRaw ? parseInt(birthDayRaw, 10) : null

        const birthError = validatePartialBirthDate(birthYear, birthMonth, birthDay)
        if (birthError) {
            return fail(400, { error: birthError })
        }

        const [member] = await db
            .insert(familyMembers)
            .values({ name, birthYear, birthMonth, birthDay })
            .returning()

        if (relationshipType && relatedMemberId) {
            await db.insert(relationships).values({
                fromMemberId: member.id,
                toMemberId: relatedMemberId,
                type: relationshipType as RelType,
            })
        }

        return { success: true }
    },
}
