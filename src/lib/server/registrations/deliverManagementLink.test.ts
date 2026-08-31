import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { deliverManagementLink } from './deliverManagementLink'
import { hashManagementToken } from './hashManagementToken'

/* The rule that decides whether a registrant can still reach a booking they paid for.

   Only sha256(token) is stored, so rotating before a confirmed send strands them between a dead
   link and one they never received — unrecoverable, because nobody can look the old plaintext up.

   Asserted against a real database, so "not rotated" means the stored hash is byte-for-byte the one
   that was there before, not that a mock was left uncalled. */

let db: Awaited<ReturnType<typeof resetTestDb>>

async function tokensOf(registrationId: string) {
    const [row] = await db
        .select({
            managementToken: registrations.managementToken,
            previousManagementToken: registrations.previousManagementToken,
        })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    return row
}

describe('deliverManagementLink', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('rotates to the delivered token once the send succeeds', async () => {
        const seeded = await seedRegistration(db)
        let delivered = ''

        const result = await deliverManagementLink({
            registrationId: seeded.registrationId,
            deliver: async (token) => {
                delivered = token
                return 'sent'
            },
        })

        expect(result).toBe('sent')
        /* The row holds the hash of exactly the token that went out in the email. */
        expect((await tokensOf(seeded.registrationId)).managementToken).toBe(
            hashManagementToken(delivered),
        )
    })

    /* THE rule. */
    it('does not rotate when delivery throws', async () => {
        const seeded = await seedRegistration(db)
        const before = await tokensOf(seeded.registrationId)

        await expect(
            deliverManagementLink({
                registrationId: seeded.registrationId,
                deliver: async () => {
                    throw new Error('resend down')
                },
            }),
        ).rejects.toThrow('resend down')

        expect(await tokensOf(seeded.registrationId)).toEqual(before)
    })

    /* And the link they are already holding must still work afterwards — a failed re-send is not
       allowed to cost them the access they had. */
    it('leaves the existing link valid after a failed delivery', async () => {
        const seeded = await seedRegistration(db)

        await expect(
            deliverManagementLink({
                registrationId: seeded.registrationId,
                deliver: async () => {
                    throw new Error('resend down')
                },
            }),
        ).rejects.toThrow()

        expect((await tokensOf(seeded.registrationId)).managementToken).toBe(
            hashManagementToken(seeded.managementToken),
        )
    })

    /* Rotation demotes rather than discards, so the link sent before this one keeps working for the
       grace period — and an open manage tab, whose cookie holds that plaintext, survives. */
    it('demotes the outgoing token instead of discarding it', async () => {
        const seeded = await seedRegistration(db)

        await deliverManagementLink({
            registrationId: seeded.registrationId,
            deliver: async () => 'sent',
        })

        expect((await tokensOf(seeded.registrationId)).previousManagementToken).toBe(
            hashManagementToken(seeded.managementToken),
        )
    })

    /* 'skipped' is the caller deciding there was nothing worth sending — a refunded registration,
       say. Nothing was emailed, so nothing may be rotated. */
    it('does not rotate when the caller skips delivery', async () => {
        const seeded = await seedRegistration(db)
        const before = await tokensOf(seeded.registrationId)

        const result = await deliverManagementLink({
            registrationId: seeded.registrationId,
            deliver: async () => 'skipped',
        })

        expect(result).toBe('skipped')
        expect(await tokensOf(seeded.registrationId)).toEqual(before)
    })

    /* The caller builds the email, so it needs the plaintext — but it must never see the hash, or
       it could rotate early and reintroduce the bug this module exists to prevent. */
    it('hands the caller a token that is not what gets stored', async () => {
        const seeded = await seedRegistration(db)
        const seen: string[] = []

        await deliverManagementLink({
            registrationId: seeded.registrationId,
            deliver: async (token) => {
                seen.push(token)
                return 'sent'
            },
        })

        expect(seen[0]).not.toBe((await tokensOf(seeded.registrationId)).managementToken)
    })
})
