import { describe, it, expect, beforeEach } from 'vitest'
import { partyMembers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The numbers on each year's card on /admin.

   One roll-up query over every year, grouped by (event, status), folded in JS. Against a real
   Postgres the folding is checked against real GROUP BY output — including the two things the fake
   could only simulate by being told to: that postgres returns sum() as a STRING, and that a group
   with no members comes back null rather than zero. The old test asserted the code handled those
   because the fixture said so; here the database says so. */

const { getEventSummaries } = await import('./getEventSummaries')

let db: Awaited<ReturnType<typeof resetTestDb>>

describe('getEventSummaries', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('reports zeroes for a reunion nobody has registered for', async () => {
        await seedEvent(db, { year: 2027 })

        const [summary] = await getEventSummaries()

        expect(summary).toMatchObject({
            year: 2027,
            attendingPeople: 0,
            attendingParties: 0,
            pendingPeople: 0,
            pendingParties: 0,
            paidCents: 0,
            outstandingCents: 0,
        })
    })

    /* The whole reason the roll-up groups by (event, status): the same rows split three ways. Paid and
       waived both have a place; pending is owed; refunded is neither, because those people are not
       coming and nobody is waiting on their money. */
    it('folds paid and waived into coming, pending into owed, and drops refunded', async () => {
        const eventId = await seedEvent(db, { year: 2027 })
        const party = (count: number, priceCents: number) =>
            Array.from({ length: count }, (_, index) => ({
                name: `Person ${index}`,
                priceCents,
            }))

        await seedRegistration(db, { eventId, status: 'paid', members: party(3, 16000) })
        await seedRegistration(db, { eventId, status: 'paid', members: party(2, 16000) })
        await seedRegistration(db, { eventId, status: 'waived', members: party(3, 16000) })
        await seedRegistration(db, { eventId, status: 'pending', members: party(9, 16000) })
        await seedRegistration(db, { eventId, status: 'refunded', members: party(7, 16000) })

        const [summary] = await getEventSummaries()

        /* 3 + 2 paid, plus 3 waived. */
        expect(summary.attendingPeople).toBe(8)
        expect(summary.attendingParties).toBe(3)
        expect(summary.pendingPeople).toBe(9)
        expect(summary.pendingParties).toBe(1)
        /* Paid only. A waived place brings in no money. */
        expect(summary.paidCents).toBe(5 * 16000)
        expect(summary.outstandingCents).toBe(9 * 16000)
        /* The seven refunded people appear in none of the four figures above. */
        expect(summary.attendingPeople + summary.pendingPeople).toBe(17)
    })

    /* postgres returns sum() as a STRING. Adding without coercing concatenates: '80000' + '48000'
       would become '8000048000', a plausible-looking number three orders of magnitude out. This is
       now the driver's real behaviour rather than a fixture that says 'cents' is a string. */
    it('coerces the string sums postgres returns', async () => {
        const eventId = await seedEvent(db, { year: 2027 })
        await seedRegistration(db, {
            eventId,
            status: 'paid',
            members: [{ name: 'A', priceCents: 16000 }],
        })
        await seedRegistration(db, {
            eventId,
            status: 'paid',
            members: [{ name: 'B', priceCents: 10000 }],
        })

        const [summary] = await getEventSummaries()

        expect(summary.paidCents).toBe(26000)
        expect(typeof summary.paidCents).toBe('number')
    })

    /* One roll-up covers every year, so each event must take only its own rows. */
    it('keeps each reunion to its own numbers', async () => {
        const current = await seedEvent(db, { year: 2027 })
        const past = await seedEvent(db, { year: 2025, status: 'archived' })
        await seedRegistration(db, {
            eventId: current,
            status: 'paid',
            members: [
                { name: 'A', priceCents: 16000 },
                { name: 'B', priceCents: 16000 },
            ],
        })
        await seedRegistration(db, {
            eventId: past,
            status: 'paid',
            members: [{ name: 'C', priceCents: 300000 }],
        })

        const summaries = await getEventSummaries()

        /* Newest year first. */
        expect(summaries.map((summary) => summary.year)).toEqual([2027, 2025])
        expect(summaries.map((summary) => summary.attendingPeople)).toEqual([2, 1])
        expect(summaries.map((summary) => summary.paidCents)).toEqual([32000, 300000])
    })

    /* A year with no registrations must still get a card, not vanish from /admin. */
    it('returns a reunion with no roll-up rows at all rather than dropping it', async () => {
        const current = await seedEvent(db, { year: 2027 })
        await seedEvent(db, { year: 2030, status: 'draft' })
        await seedRegistration(db, {
            eventId: current,
            status: 'paid',
            members: [{ name: 'A', priceCents: 16000 }],
        })

        const summaries = await getEventSummaries()

        expect(summaries).toHaveLength(2)
        expect(summaries.find((summary) => summary.year === 2030)).toMatchObject({
            attendingPeople: 0,
            paidCents: 0,
        })
    })

    /* An abandoned checkout leaves a permanent pending row with no members, which is a real state:
       these are deliberately not cleaned up. Its party must count, its people must not, and the
       null sum postgres returns for it must not poison the total. */
    it('counts a party with no members without breaking the totals', async () => {
        const eventId = await seedEvent(db, { year: 2027 })
        await seedRegistration(db, {
            eventId,
            status: 'pending',
            members: [{ name: 'Temp', priceCents: 0 }],
        })
        /* An abandoned checkout can lose its party entirely — removeMember lets the registrant
           delete their own row. */
        await db.delete(partyMembers)

        const [summary] = await getEventSummaries()

        expect(summary.pendingParties).toBe(1)
        expect(summary.pendingPeople).toBe(0)
        expect(summary.outstandingCents).toBe(0)
    })
})
