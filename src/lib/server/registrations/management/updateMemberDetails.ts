import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { parseBirthDate } from '$lib/utils/age'
import { hashManagementToken } from '../hashManagementToken'

/* Updates mutable fields on a party_member. Each field is only written when the caller
   explicitly passed it; passing `undefined` means "leave the existing value alone". This
   prevents the shirt-size-disabled-on-the-form case (and similar) from silently nulling
   a previously-saved value. Token-gated (compared by hash): 403 on mismatch. */
export async function updateMemberDetails(
    memberId: string,
    data: { birthDate?: string | undefined; shirtSize?: string | undefined },
    managementToken: string,
): Promise<void> {
    const tokenHash = hashManagementToken(managementToken)
    const [member] = await db
        .select({
            id: partyMembers.id,
            registrationToken: registrations.managementToken,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, memberId))
        .limit(1)

    if (!member || member.registrationToken !== tokenHash) {
        throw error(403)
    }

    const updates: Partial<typeof partyMembers.$inferInsert> = {}
    if (data.birthDate !== undefined) {
        if (data.birthDate === '') {
            updates.birthYear = null
            updates.birthMonth = null
            updates.birthDay = null
        } else {
            const parsed = parseBirthDate(data.birthDate)
            if (parsed) {
                updates.birthYear = parsed.birthYear
                updates.birthMonth = parsed.birthMonth
                updates.birthDay = parsed.birthDay
            }
        }
    }
    if (data.shirtSize !== undefined) {
        updates.shirtSize = data.shirtSize || null
    }

    if (Object.keys(updates).length === 0) {
        return
    }

    await db.update(partyMembers).set(updates).where(eq(partyMembers.id, memberId))
    dbg.register('updateMemberDetails memberId=%s fields=%j', memberId, Object.keys(updates))
}
