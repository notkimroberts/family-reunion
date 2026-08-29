import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Chainable db mock. Both queries end on a terminal that resolves from the queue, in the order
   getEventSummaries creates them: the event list, then the (event, status) roll-up. */
const { mockDb, resultQueue } = vi.hoisted(() => {
    const resultQueue: unknown[][] = []
    const chain = {
        from: () => chain,
        leftJoin: () => chain,
        orderBy: () => Promise.resolve(resultQueue.shift() ?? []),
        groupBy: () => Promise.resolve(resultQueue.shift() ?? []),
    }
    return { mockDb: { select: () => chain }, resultQueue }
})

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    partyMembers: { id: {}, registrationId: {}, priceCents: {} },
    registrations: { id: {}, eventId: {}, status: {} },
    reunionEvents: {
        id: {},
        title: {},
        year: {},
        status: {},
        startDate: {},
        endDate: {},
        registrationLockDate: {},
    },
}))
vi.mock('drizzle-orm', () => ({
    count: vi.fn(),
    countDistinct: vi.fn(),
    desc: vi.fn(),
    eq: vi.fn(),
    sum: vi.fn(),
}))

const { getEventSummaries } = await import('./getEventSummaries')

const EVENT_2027 = {
    id: 'evt-2027',
    title: 'Patterson Family Reunion',
    year: 2027,
    status: 'open',
    startDate: null,
    endDate: null,
    registrationLockDate: null,
}

beforeEach(() => {
    vi.clearAllMocks()
    resultQueue.length = 0
})

describe('getEventSummaries', () => {
    it('reports zeroes for a reunion nobody has registered for', async () => {
        resultQueue.push([EVENT_2027], [])

        const [summary] = await getEventSummaries()

        expect(summary).toMatchObject({
            id: 'evt-2027',
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
       waived both have a place; pending is owed; refunded is neither, because those people are not coming
       and nobody is waiting on their money. */
    it('folds paid and waived into coming, pending into owed, and drops refunded', async () => {
        resultQueue.push(
            [EVENT_2027],
            [
                { eventId: 'evt-2027', status: 'paid', parties: 2, people: 5, cents: '80000' },
                { eventId: 'evt-2027', status: 'waived', parties: 1, people: 3, cents: '48000' },
                { eventId: 'evt-2027', status: 'pending', parties: 4, people: 9, cents: '144000' },
                { eventId: 'evt-2027', status: 'refunded', parties: 3, people: 7, cents: '99900' },
            ],
        )

        const [summary] = await getEventSummaries()

        expect(summary.attendingPeople).toBe(8)
        expect(summary.attendingParties).toBe(3)
        expect(summary.pendingPeople).toBe(9)
        expect(summary.pendingParties).toBe(4)
        /* Paid only. A waived place brings in no money. */
        expect(summary.paidCents).toBe(80000)
        expect(summary.outstandingCents).toBe(144000)
    })

    /* postgres returns sum() as a STRING. Adding without coercing concatenates: '80000' + '48000' would
       become '8000048000', a plausible-looking number three orders of magnitude out. */
    it('coerces the string sums postgres returns', async () => {
        resultQueue.push(
            [EVENT_2027],
            [
                { eventId: 'evt-2027', status: 'paid', parties: 1, people: 1, cents: '16000' },
                { eventId: 'evt-2027', status: 'paid', parties: 1, people: 1, cents: '10000' },
            ],
        )

        const [summary] = await getEventSummaries()

        expect(summary.paidCents).toBe(26000)
    })

    /* A group with no members at all comes back with a null sum, not a zero. */
    it('treats a null sum as zero', async () => {
        resultQueue.push(
            [EVENT_2027],
            [{ eventId: 'evt-2027', status: 'paid', parties: 1, people: 0, cents: null }],
        )

        const [summary] = await getEventSummaries()

        expect(summary.paidCents).toBe(0)
        expect(summary.attendingParties).toBe(1)
    })

    /* One roll-up covers every year, so each event must take only its own rows. */
    it('keeps each reunion to its own numbers', async () => {
        resultQueue.push(
            [EVENT_2027, { ...EVENT_2027, id: 'evt-2025', year: 2025, status: 'archived' }],
            [
                { eventId: 'evt-2027', status: 'paid', parties: 1, people: 2, cents: '32000' },
                { eventId: 'evt-2025', status: 'paid', parties: 5, people: 20, cents: '300000' },
            ],
        )

        const summaries = await getEventSummaries()

        expect(summaries.map((s) => s.attendingPeople)).toEqual([2, 20])
        expect(summaries.map((s) => s.paidCents)).toEqual([32000, 300000])
    })

    it('returns a reunion with no roll-up rows at all rather than dropping it', async () => {
        resultQueue.push(
            [EVENT_2027, { ...EVENT_2027, id: 'evt-2030', year: 2030, status: 'draft' }],
            [{ eventId: 'evt-2027', status: 'paid', parties: 1, people: 1, cents: '16000' }],
        )

        const summaries = await getEventSummaries()

        expect(summaries).toHaveLength(2)
        expect(summaries[1]).toMatchObject({ id: 'evt-2030', attendingPeople: 0, paidCents: 0 })
    })
})
