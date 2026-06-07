import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

/* Sets partyMembers.familyMemberId. Pass null to unlink. The FK constraint enforces the family_member exists; we translate the Postgres FK violation code into a 400 so the admin sees a clean message. Admin-only — caller must guard. */
export async function linkPartyMember(
    partyMemberId: string,
    familyMemberId: string | null,
): Promise<void> {
    let result
    try {
        result = await db
            .update(partyMembers)
            .set({ familyMemberId })
            .where(eq(partyMembers.id, partyMemberId))
            .returning({ id: partyMembers.id })
    } catch (err: unknown) {
        if (
            typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            (err as { code?: string }).code === '23503'
        ) {
            throw error(400, 'Family member not found')
        }
        throw err
    }

    if (result.length === 0) {
        throw error(404, 'Party member not found')
    }

    dbg.register(
        'link party_member=%s -> family_member=%s',
        partyMemberId,
        familyMemberId ?? '(unlinked)',
    )
}
