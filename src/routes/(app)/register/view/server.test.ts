import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { partyMembers, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import type { RegistrationViewMember } from '../types'

/* What the view link hands to the browser.

   The link is a bearer credential with no per-request check, and families forward it. Anything the
   load returns is readable in the page source by whoever holds it, whether or not the page renders
   it — so the projection, not the markup, is what decides what a forwarded link leaks. */

const { load } = await import('./+page.server')

type ViewLoadEvent = Parameters<typeof load>[0]

let db: Awaited<ReturnType<typeof resetTestDb>>

function viewWithCookie(token: string) {
    return load({
        url: new URL('http://localhost/register/view'),
        cookies: { get: () => token, set: vi.fn(), delete: vi.fn() },
    } as unknown as ViewLoadEvent)
}

describe('GET /register/view', () => {
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

        const result = await viewWithCookie(seeded.viewToken)

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

    it('passes an owed person through to the page', async () => {
        const seeded = await seedRegistration(db, {
            members: [
                { name: 'Alice Patterson', priceCents: 16509 },
                { name: 'Jada Patterson', priceCents: 10000, paymentDue: true },
            ],
        })

        const result = await viewWithCookie(seeded.viewToken)

        if (!result || result.missingToken) {
            throw new Error('expected the registration to load')
        }
        const flags = (members: RegistrationViewMember[]) =>
            members.map((member) => member.paymentDue)
        expect(flags(result.members)).toEqual([false, true])
    })

    /* Card places are stored gross, with the fee inside recorded beside them. The page gets the fee
       to show the tier price with it underneath, and never the Stripe id. */
    it('sends the card fee stored on a place a card paid for', async () => {
        const seeded = await seedRegistration(db, {
            members: [
                {
                    name: 'Alice Patterson',
                    priceCents: 17024,
                    cardFeeCents: 524,
                    stripePaymentIntentId: 'pi_1',
                },
                { name: 'Jada Patterson', priceCents: 10000 },
            ],
        })

        const result = await viewWithCookie(seeded.viewToken)

        if (!result || result.missingToken) {
            throw new Error('expected the registration to load')
        }
        const fees = (members: RegistrationViewMember[]) =>
            members.map((member) => member.cardFeeCents)
        expect(fees(result.members)).toEqual([524, 0])
        expect(JSON.stringify(result)).not.toContain('pi_1')
    })
})
