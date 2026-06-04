import { db } from '$lib/server/db'
import { userProfiles } from '$lib/server/db/schema'
import { parseBirthDate } from '$lib/utils/age'

// Inserts or updates user_profiles for userId, parsing birthDate into split year/month/day integers.
export async function upsertUserProfile(
    userId: string,
    data: {
        birthDate: string | undefined
        phone: string
        mailingAddress: { street: string; city: string; state: string; zip: string }
    },
): Promise<void> {
    const parsed = data.birthDate ? parseBirthDate(data.birthDate) : undefined
    const values = {
        userId,
        birthYear: parsed?.birthYear ?? null,
        birthMonth: parsed?.birthMonth ?? null,
        birthDay: parsed?.birthDay ?? null,
        phone: data.phone || null,
        mailingAddress: data.mailingAddress,
    }
    await db
        .insert(userProfiles)
        .values(values)
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: { ...values, updatedAt: new Date() },
        })
}
