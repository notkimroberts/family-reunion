import { fail } from '@sveltejs/kit'
import { eq, or } from 'drizzle-orm'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { familyMembers, relationships } from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const [myFamilyMember] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id))
        .limit(1)

    const allMembers = await db.select().from(familyMembers)

    let myRelationships: { id: string; type: string; toMember: { id: string; name: string } }[] = []

    if (myFamilyMember) {
        const rels = await db
            .select()
            .from(relationships)
            .where(eq(relationships.fromMemberId, myFamilyMember.id))

        myRelationships = rels.map((r) => {
            const toMember = allMembers.find((m) => m.id === r.toMemberId)
            return {
                id: r.id,
                type: r.type,
                toMember: { id: r.toMemberId, name: toMember?.name ?? 'Unknown' },
            }
        })
    }

    return {
        user,
        myFamilyMember,
        allMembers: allMembers.filter((m) => m.id !== myFamilyMember?.id),
        myRelationships,
    }
}

export const actions: Actions = {
    create_member: async (event) => {
        const user = requireAuth(event)
        const data = await event.request.formData()
        const name = data.get('name') as string
        const birthYear = data.get('birthYear') as string
        const birthMonth = data.get('birthMonth') as string
        const birthDay = data.get('birthDay') as string

        if (!name?.trim()) {
            return fail(400, { error: 'Name is required' })
        }

        await db.insert(familyMembers).values({
            userId: user.id,
            name: name.trim(),
            birthYear: birthYear ? parseInt(birthYear) : null,
            birthMonth: birthMonth ? parseInt(birthMonth) : null,
            birthDay: birthDay ? parseInt(birthDay) : null,
        })

        return { success: true }
    },

    add_relationship: async (event) => {
        const user = requireAuth(event)
        const data = await event.request.formData()
        const toMemberId = data.get('toMemberId') as string
        const type = data.get('type') as string

        if (!toMemberId || !type) {
            return fail(400, { error: 'All fields required' })
        }

        const [myFamilyMember] = await db
            .select()
            .from(familyMembers)
            .where(eq(familyMembers.userId, user.id))
            .limit(1)

        if (!myFamilyMember) {
            return fail(400, { error: 'Create your profile first' })
        }

        await db.insert(relationships).values({
            fromMemberId: myFamilyMember.id,
            toMemberId,
            type: type as any,
            createdByUserId: user.id,
        })

        return { success: true }
    },

    remove_relationship: async (event) => {
        const user = requireAuth(event)
        const data = await event.request.formData()
        const relationshipId = data.get('relationshipId') as string

        if (!relationshipId) {
            return fail(400, { error: 'Missing relationship ID' })
        }

        await db.delete(relationships).where(eq(relationships.id, relationshipId))

        return { success: true }
    },
}
