import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { parseBirthDate } from '$lib/utils/age'

export async function updateMemberDetails(
    memberId: string,
    data: { birthDate?: string; shirtSize?: string },
    userId: string,
): Promise<void> {
    const [member] = await db
        .select({
            id: partyMembers.id,
            registrationUserId: registrations.userId,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, memberId))
        .limit(1)

    if (!member || member.registrationUserId !== userId) {
        throw error(403)
    }

    const parsed = data.birthDate ? parseBirthDate(data.birthDate) : null
    await db
        .update(partyMembers)
        .set({
            birthYear: parsed?.birthYear ?? null,
            birthMonth: parsed?.birthMonth ?? null,
            birthDay: parsed?.birthDay ?? null,
            shirtSize: data.shirtSize || null,
        })
        .where(eq(partyMembers.id, memberId))
    dbg.register('updateMemberDetails memberId=%s', memberId)
}
