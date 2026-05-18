import { error, fail } from '@sveltejs/kit'
import { eq, inArray, desc } from 'drizzle-orm'
import { db } from '$lib/server/db'
import {
    familyMembers,
    familyMemberEdits,
    relationships,
    userProfiles,
} from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

type Rel = { from: string; to: string; type: string }

function getParents(id: string, allRels: Rel[]): string[] {
    return [
        ...new Set(
            allRels
                .filter(
                    (r) =>
                        (r.type === 'child' && r.from === id) ||
                        (r.type === 'parent' && r.to === id),
                )
                .map((r) => (r.type === 'child' ? r.to : r.from)),
        ),
    ]
}

// BFS from memberId upward; returns shortest path [root, ..., parent] excluding memberId
function findAncestryChain(memberId: string, allRels: Rel[]): string[] {
    const queue: [string, string[]][] = [[memberId, [memberId]]]
    const visited = new Set<string>([memberId])

    while (queue.length > 0) {
        const item = queue.shift()!
        const [currentId, path] = item
        const parents = getParents(currentId, allRels)

        if (parents.length === 0) {
            return path.slice(1).reverse()
        }

        for (const parentId of parents) {
            if (!visited.has(parentId)) {
                visited.add(parentId)
                queue.push([parentId, [...path, parentId]])
            }
        }
    }

    return []
}

const memberSelect = {
    id: familyMembers.id,
    name: familyMembers.name,
    birthYear: familyMembers.birthYear,
    birthMonth: familyMembers.birthMonth,
    birthDay: familyMembers.birthDay,
    photoUrl: userProfiles.profilePhotoUrl,
}

export const load: PageServerLoad = async ({ params }) => {
    const { id } = params

    const [member] = await db
        .select(memberSelect)
        .from(familyMembers)
        .leftJoin(userProfiles, eq(familyMembers.userId, userProfiles.userId))
        .where(eq(familyMembers.id, id))

    if (!member) {
        throw error(404, 'Member not found')
    }

    const allRels = await db.select().from(relationships)
    const relsMapped = allRels.map((r) => ({
        from: r.fromMemberId,
        to: r.toMemberId,
        type: r.type,
    }))

    const memberRels = relsMapped.filter((r) => r.from === id || r.to === id)
    const chainIds = findAncestryChain(id, relsMapped)

    const directRelatedIds = [...new Set(memberRels.map((r) => (r.from === id ? r.to : r.from)))]
    const allNeededIds = [...new Set([...directRelatedIds, ...chainIds])]

    const fetched =
        allNeededIds.length > 0
            ? await db
                  .select(memberSelect)
                  .from(familyMembers)
                  .leftJoin(userProfiles, eq(familyMembers.userId, userProfiles.userId))
                  .where(inArray(familyMembers.id, allNeededIds))
            : []

    const memberMap = new Map(fetched.map((m) => [m.id, m]))

    const ancestryChain = chainIds
        .map((cId) => {
            const m = memberMap.get(cId)
            return m ? { id: cId, name: m.name } : null
        })
        .filter((m): m is { id: string; name: string } => m !== null)

    const editHistory = await db
        .select()
        .from(familyMemberEdits)
        .where(eq(familyMemberEdits.memberId, id))
        .orderBy(desc(familyMemberEdits.createdAt))

    return {
        member: { ...member, photoUrl: member.photoUrl ?? null },
        relationships: memberRels,
        relatedMembers: fetched
            .filter((m) => directRelatedIds.includes(m.id))
            .map((m) => ({ ...m, photoUrl: m.photoUrl ?? null })),
        ancestryChain,
        editHistory,
    }
}

export const actions: Actions = {
    editMember: async ({ params, request }) => {
        const { id } = params
        const data = await request.formData()
        const name = (data.get('name') as string)?.trim()
        const birthDate = data.get('birthDate') as string | null
        const editorName = (data.get('editorName') as string)?.trim()
        const editorEmail = (data.get('editorEmail') as string)?.trim().toLowerCase()

        if (!name) {
            return fail(400, { error: 'Name is required' })
        }
        if (!editorName || !editorEmail) {
            return fail(400, { error: 'Your name and email are required' })
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

        await db
            .update(familyMembers)
            .set({ name, birthYear, birthMonth, birthDay, updatedAt: new Date() })
            .where(eq(familyMembers.id, id))

        await db.insert(familyMemberEdits).values({
            memberId: id,
            editorName,
            editorEmail,
            snapshot: { name, birthYear, birthMonth, birthDay },
        })

        return { success: true }
    },

    restoreSnapshot: async ({ params, request, locals }) => {
        if (locals.user?.role !== 'admin') {
            return fail(403, { error: 'Admin only' })
        }

        const { id } = params
        const data = await request.formData()
        const snapshotId = data.get('snapshotId') as string

        const [edit] = await db
            .select()
            .from(familyMemberEdits)
            .where(eq(familyMemberEdits.id, snapshotId))

        if (!edit || edit.memberId !== id) {
            return fail(404, { error: 'Snapshot not found' })
        }

        const { name, birthYear, birthMonth, birthDay } = edit.snapshot

        await db
            .update(familyMembers)
            .set({ name, birthYear, birthMonth, birthDay, updatedAt: new Date() })
            .where(eq(familyMembers.id, id))

        await db.insert(familyMemberEdits).values({
            memberId: id,
            editorName: locals.user.name,
            editorEmail: locals.user.email,
            snapshot: { name, birthYear, birthMonth, birthDay },
        })

        return { success: true }
    },
}
