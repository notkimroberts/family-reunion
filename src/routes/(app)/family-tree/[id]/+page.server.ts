import { error, fail } from '@sveltejs/kit'
import { eq, inArray, asc } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import {
    familyMembers,
    partyMembers,
    registrations,
    relationships,
    reunionEvents,
} from '$lib/server/db/schema'
import { validatePartialBirthDate } from '$lib/utils/age/validatePartialBirthDate'
import type { PageServerLoad, Actions } from './$types'
import type { Rel } from './types'

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

/* BFS from memberId upward; returns shortest path [root, ..., parent] excluding memberId. */
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
}

export const load: PageServerLoad = async ({ params, locals }) => {
    const { id } = params
    const isAdmin = locals.user?.role === 'admin'

    const [member] = await db
        .select(memberSelect)
        .from(familyMembers)
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
                  .where(inArray(familyMembers.id, allNeededIds))
            : []

    const memberMap = new Map(fetched.map((m) => [m.id, m]))

    const ancestryChain = chainIds
        .map((cId) => {
            const m = memberMap.get(cId)
            return m ? { id: cId, name: m.name } : undefined
        })
        .filter((m): m is { id: string; name: string } => m !== undefined)

    /* Attendances linked to this tree node — admin-only to avoid leaking reunion attendance
       and tier brackets to unauthenticated visitors via the public family-tree route. */
    const attendances = isAdmin
        ? await db
              .select({
                  partyMemberId: partyMembers.id,
                  eventYear: reunionEvents.year,
                  eventTitle: reunionEvents.title,
                  tierLabel: partyMembers.tierLabel,
                  registrationStatus: registrations.status,
              })
              .from(partyMembers)
              .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
              .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
              .where(eq(partyMembers.familyMemberId, id))
              .orderBy(asc(reunionEvents.year))
        : []

    return {
        member,
        relationships: memberRels,
        relatedMembers: fetched.filter((m) => directRelatedIds.includes(m.id)),
        ancestryChain,
        attendances,
    }
}

export const actions: Actions = {
    editMember: async (event) => {
        requireAdmin(event)
        const { id } = event.params
        const data = await event.request.formData()
        const name = (data.get('name') as string)?.trim()
        const birthYearRaw = (data.get('birthYear') as string)?.trim()
        const birthMonthRaw = (data.get('birthMonth') as string)?.trim()
        const birthDayRaw = (data.get('birthDay') as string)?.trim()

        if (!name) {
            return fail(400, { error: 'Name is required' })
        }

        const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null
        const birthMonth = birthMonthRaw ? parseInt(birthMonthRaw, 10) : null
        const birthDay = birthDayRaw ? parseInt(birthDayRaw, 10) : null

        const birthError = validatePartialBirthDate(birthYear, birthMonth, birthDay)
        if (birthError) {
            return fail(400, { error: birthError })
        }

        await db
            .update(familyMembers)
            .set({ name, birthYear, birthMonth, birthDay, updatedAt: new Date() })
            .where(eq(familyMembers.id, id!))

        return { success: true }
    },
}
