import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { partyMembers, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* What the management link hands to the browser.

   The link is a bearer credential with no per-request check, and families forward it. Anything the
   load returns is readable in the page source by whoever holds it, whether or not the page renders
   it — so the projection, not the markup, is what decides what a forwarded link leaks. */

const { load } = await import('./+page.server')

type ManageLoadEvent = Parameters<typeof load>[0]

let db: Awaited<ReturnType<typeof resetTestDb>>

function viewWithCookie(token: string) {
    return load({
        url: new URL('http://localhost/register/manage'),
        cookies: { get: () => token, set: vi.fn(), delete: vi.fn() },
    } as unknown as ManageLoadEvent)
}

describe('GET /register/manage', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('does not send home addresses, Stripe ids or event metadata to the browser', async () => {
        const seeded = await seedRegistration(db)
        await db
            .update(partyMembers)
            .set({
                addressLine1: '12 Elm Street',
                addressCity: 'Oakland',
                addressState: 'CA',
                addressZip: '94612',
            })
            .where(eq(partyMembers.registrationId, seeded.registrationId))
        await db
            .update(reunionEvents)
            .set({ metadata: { venue: { name: 'Oakstop' } } })
            .where(eq(reunionEvents.id, seeded.eventId))

        const result = await viewWithCookie(seeded.managementToken)

        if (!result || result.missingToken) {
            throw new Error('expected the registration to load')
        }
        const [member] = result.members
        expect(member.name).toBe('Alice Patterson')
        expect(Object.keys(member).filter((key) => /^(address|stripe)/.test(key))).toEqual([])
        expect(JSON.stringify(result)).not.toContain('12 Elm Street')
        expect(result.event).not.toHaveProperty('metadata')
        expect(result.event.title).toBe('Patterson Family Reunion 2027')
    })
})
