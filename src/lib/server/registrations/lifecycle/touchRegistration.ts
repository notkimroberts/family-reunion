import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'

/* Records that something about a registration changed, without changing its status.

   Its own module because five call sites were each writing the same follow-up UPDATE by hand —
   addAdminMember, removeAdminMember, updateAdminMemberDetails, removeMember and the update
   notification — and one that should have, updateMemberDetails, was not. A registration whose
   updatedAt does not move is one an organiser scanning the list has no reason to look at.

   Deliberately NOT a database trigger: party-member edits are what most of these represent, and a
   trigger on party_members would also fire for the webhook's own inserts, which manage the parent's
   timestamp inside their transaction for idempotency reasons. */
export async function touchRegistration(registrationId: string): Promise<void> {
    await db
        .update(registrations)
        .set({ updatedAt: new Date() })
        .where(eq(registrations.id, registrationId))
}
