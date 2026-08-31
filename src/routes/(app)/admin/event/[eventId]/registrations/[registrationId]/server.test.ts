import { stringify } from 'devalue'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { partyMembers, registrationAudit, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { hashManagementToken } from '$lib/server/registrations/hashManagementToken'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { seedTier } from '$lib/server/testing/seedTier'
import { seedUser } from '$lib/server/testing/seedUser'

/* One save for the contact, the status and every member of a party.

   Everything below the action is real: the guards that refuse a reprice on a paid party, the audit
   foreign key, the token rotation the notification performs. Only Resend is mocked, because sending
   is the one thing a test must not do.

   That matters most for the batching contract. Each notification ROTATES the management token, so
   three notifications for one sitting would leave two dead links in the registrant's inbox. The
   version this replaced asserted `notifyRegistrationUpdated` was called once — a statement about the
   action's shape. Here the rotation itself is counted. */

const mockSendConfirmation = vi.fn()
const mockSendRecovery = vi.fn()
const mockReportError = vi.fn()

vi.mock('$lib/server/email', () => ({
    sendRegistrationConfirmation: mockSendConfirmation,
    sendRecoveryEmail: mockSendRecovery,
    sendCancellationEmail: vi.fn(),
}))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { actions } = await import('./+page.server')

const ADMIN = { id: 'admin-1', name: 'Kim Roberts', role: 'admin' }

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string
let adultTierId: string
let childTierId: string
let seeded: Awaited<ReturnType<typeof seedRegistration>>

const STAGED_MEMBER = {
    name: 'Marcus Patterson',
    birthDate: '1990-05-05',
    shirtSize: 'L',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'yes',
    attendedReunion2025: 'no',
}

function editForm(overrides: Record<string, unknown> = {}) {
    return {
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        contactPhone: '',
        status: 'pending',
        members: [],
        newMembers: [],
        removedMemberIds: [],
        ...overrides,
    }
}

function makeEvent(
    body: Record<string, unknown> | undefined,
    params: { eventId?: string; registrationId?: string } = {},
) {
    const formData = new FormData()
    if (body) {
        formData.append('__superform_json', stringify(body))
    }
    const url = new URL('http://localhost/admin/event/x/registrations/y')
    return {
        request: new Request(url, { method: 'POST', body: formData }),
        url,
        params: {
            eventId: params.eventId ?? eventId,
            registrationId: params.registrationId ?? seeded.registrationId,
        },
        locals: { user: ADMIN },
    } as unknown as Parameters<typeof actions.save>[0]
}

const save = (body?: Record<string, unknown>, params?: Parameters<typeof makeEvent>[1]) =>
    actions.save(makeEvent(body ?? editForm(), params))

async function registrationRow() {
    const [row] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.id, seeded.registrationId))
    return row
}

async function members() {
    return db
        .select()
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, seeded.registrationId))
}

async function auditActions() {
    const rows = await db
        .select()
        .from(registrationAudit)
        .where(eq(registrationAudit.registrationId, seeded.registrationId))
    return rows.map((row) => row.action)
}

beforeEach(async () => {
    vi.clearAllMocks()
    mockSendConfirmation.mockResolvedValue(undefined)
    db = await resetTestDb()
    await seedUser(db, ADMIN)
    eventId = await seedEvent(db)
    adultTierId = await seedTier(db, eventId, { label: 'Adult', priceCents: 16000 })
    childTierId = await seedTier(db, eventId, { label: 'Child', priceCents: 9000 })
    seeded = await seedRegistration(db, {
        eventId,
        status: 'pending',
        members: [
            { name: 'Alice Patterson', priceCents: 16000 },
            { name: 'Bo Patterson', priceCents: 9000, tierLabel: 'Child' },
        ],
    })
})

describe('POST .../registrations/[registrationId] save', () => {
    it('requires an admin', async () => {
        const event = makeEvent(editForm())
        Object.assign(event, { locals: { user: undefined } })

        await expect(actions.save(event)).rejects.toBeDefined()
    })

    it('returns 400 without writing anything when validation fails', async () => {
        const result = await save(editForm({ contactEmail: 'not-an-email' }))

        expect(result).toMatchObject({ status: 400 })
        expect((await registrationRow()).contactEmail).toBe('alice@example.com')
        expect(mockSendConfirmation).not.toHaveBeenCalled()
    })

    it('does not email when nothing actually changed', async () => {
        const result = await save()

        expect(mockSendConfirmation).not.toHaveBeenCalled()
        expect(result).toMatchObject({ saved: true, notified: false })
    })

    it('records a status change, audits it, and tells the registrant', async () => {
        await save(editForm({ status: 'paid' }))

        expect((await registrationRow()).status).toBe('paid')
        expect(await auditActions()).toContain('status_changed')
        expect(mockSendConfirmation).toHaveBeenCalledOnce()
    })

    it('builds the manage URL from the request origin', async () => {
        await save(editForm({ status: 'paid' }))

        const [, data] = mockSendConfirmation.mock.calls[0]
        expect(data.manageUrl).toMatch(/^http:\/\/localhost\/register\/manage\?token=/)
    })

    /* Batching is the whole reason this is one action: each notification rotates the management
       token, so three separate ones would leave two dead links in the registrant's inbox. Counted
       here as ONE rotation, not as one call to a mock. */
    it('rotates the token exactly once however much changed', async () => {
        await save(
            editForm({
                status: 'paid',
                contactName: 'Alice Patterson-Jones',
                members: [
                    {
                        memberId: seeded.memberIds[1],
                        name: 'Bo P',
                        shirtSize: 'M',
                        vegetarianMeal: '',
                        attendedReunion2025: '',
                    },
                ],
            }),
        )

        const row = await registrationRow()
        expect(mockSendConfirmation).toHaveBeenCalledOnce()
        /* The link the registrant held is demoted, not discarded — one generation, not three. */
        expect(row.previousManagementToken).toBe(hashManagementToken(seeded.managementToken))
        const [, data] = mockSendConfirmation.mock.calls[0]
        expect(data.changeSummary.length).toBeGreaterThan(1)
    })

    /* Removals run before edits so a member deleted in this sitting is not also updated — that would
       404 on a row that no longer exists and fail the whole save. */
    it('does not update a member it removed in the same save', async () => {
        const result = await save(
            editForm({
                members: [
                    {
                        memberId: seeded.memberIds[1],
                        name: 'Gone',
                        shirtSize: 'M',
                        vegetarianMeal: '',
                        attendedReunion2025: '',
                    },
                ],
                removedMemberIds: [seeded.memberIds[1]],
            }),
        )

        expect(result).toMatchObject({ saved: true })
        expect((await members()).map((row) => row.name)).toEqual(['Alice Patterson'])
    })

    /* A guard refusing — repricing a paid party, emptying a party — has to reach the organiser as its
       own reason. A generic "save failed" leaves them with no idea what to do instead. */
    it('surfaces a guard refusal message rather than a generic failure', async () => {
        await db
            .update(registrations)
            .set({ status: 'paid' })
            .where(eq(registrations.id, seeded.registrationId))

        const result = await save(
            editForm({ status: 'paid', removedMemberIds: [seeded.memberIds[1]] }),
        )

        expect(result).toMatchObject({ status: 409 })
        expect(JSON.stringify(result)).toContain('refund')
        expect(await members()).toHaveLength(2)
        expect(mockSendConfirmation).not.toHaveBeenCalled()
    })

    it('refuses to edit a cancelled registration', async () => {
        await db
            .update(registrations)
            .set({ status: 'refunded' })
            .where(eq(registrations.id, seeded.registrationId))

        const result = await save(editForm({ contactName: 'Anything' }))

        expect(result).toMatchObject({ status: 409 })
        expect((await registrationRow()).contactName).toBe('Alice Patterson')
    })

    /* The change is already committed when the email is attempted. Reporting the save as failed would
       send the organiser back to redo work that actually landed. */
    it('still reports the save as succeeded when the notification fails', async () => {
        mockSendConfirmation.mockRejectedValue(new Error('Resend rejected the email'))

        const result = await save(editForm({ status: 'paid' }))

        expect(result).toMatchObject({ saved: true, notified: false })
        expect((await registrationRow()).status).toBe('paid')
        expect(mockReportError).toHaveBeenCalled()
        /* Nothing was delivered, so nothing may be rotated. */
        expect((await registrationRow()).previousManagementToken).toBeNull()
    })
})

describe('save: staged additions', () => {
    /* Additions used to be their own action with their own immediate write and its own email.
       Batching them into the save is the point. */
    it('adds each staged member offline, at the NET tier price', async () => {
        await save(editForm({ newMembers: [{ ...STAGED_MEMBER, tierId: childTierId }] }))

        const added = (await members()).find((row) => row.name === 'Marcus Patterson')
        expect(added).toMatchObject({
            tierLabel: 'Child',
            /* Net, not grossed up: nothing was charged. */
            priceCents: 9000,
            stripePaymentIntentId: null,
            vegetarianMeal: true,
            attendedReunion2025: false,
        })
    })

    it('sends ONE email however many people were added', async () => {
        await save(
            editForm({
                newMembers: [
                    { ...STAGED_MEMBER, tierId: adultTierId },
                    { ...STAGED_MEMBER, name: 'Dana Patterson', tierId: adultTierId },
                ],
            }),
        )

        expect(await members()).toHaveLength(4)
        expect(mockSendConfirmation).toHaveBeenCalledOnce()
        const [, data] = mockSendConfirmation.mock.calls[0]
        expect(data.changeSummary).toHaveLength(2)
    })

    it('audits every addition', async () => {
        await save(editForm({ newMembers: [{ ...STAGED_MEMBER, tierId: adultTierId }] }))

        expect(await auditActions()).toContain('member_added')
    })

    /* The money guardrails are about money already taken. Adding an offline place at face value owes
       nobody a refund, so it stays allowed on a paid party — unlike a reprice or a removal. */
    it('allows adding to a PAID registration', async () => {
        await db
            .update(registrations)
            .set({ status: 'paid' })
            .where(eq(registrations.id, seeded.registrationId))

        const result = await save(
            editForm({ status: 'paid', newMembers: [{ ...STAGED_MEMBER, tierId: adultTierId }] }),
        )

        expect(result).toMatchObject({ saved: true })
        expect(await members()).toHaveLength(3)
    })
})

describe('reissue_link', () => {
    it('emails a fresh link, rotates to it, and audits the re-issue', async () => {
        mockSendRecovery.mockResolvedValue(undefined)

        await actions.reissue_link(makeEvent(undefined))

        const [, data] = mockSendRecovery.mock.calls[0]
        expect(data.manageUrl).toMatch(/^http:\/\/localhost\/register\/manage\?token=/)
        const token = data.manageUrl.split('token=')[1]
        expect((await registrationRow()).managementToken).toBe(hashManagementToken(token))
        expect(await auditActions()).toContain('link_reissued')
    })

    /* A failed send means nothing was rotated, so the old link still works. An admin who believes
       they have re-issued a link and has not is worse off than one who is told. */
    it('reports the failure and leaves the existing link working', async () => {
        mockSendRecovery.mockRejectedValue(new Error('Resend rejected the email'))

        const result = await actions.reissue_link(makeEvent(undefined))

        expect(result).toMatchObject({ status: 502 })
        expect(JSON.stringify(result)).toContain('existing link still works')
        expect((await registrationRow()).managementToken).toBe(
            hashManagementToken(seeded.managementToken),
        )
        expect(await auditActions()).toHaveLength(0)
        expect(mockReportError).toHaveBeenCalled()
    })
})

/* The URL names an event AND a registration, and before the move nothing made them agree: the lookup
   was global. /admin/event/<2024>/registrations/<a-2026-registration> would have rendered and EDITED
   the 2026 party inside the 2024 shell. */
describe('the event in the URL must own the registration', () => {
    it('404s save when the registration belongs to another event', async () => {
        const otherYear = await seedEvent(db, { year: 2026, status: 'closed' })

        await expect(
            save(editForm({ status: 'paid' }), { eventId: otherYear }),
        ).rejects.toMatchObject({ status: 404 })

        expect((await registrationRow()).status).toBe('pending')
        expect(await auditActions()).toHaveLength(0)
        expect(mockSendConfirmation).not.toHaveBeenCalled()
    })

    it('does not re-issue a link for a registration in another event', async () => {
        const otherYear = await seedEvent(db, { year: 2026, status: 'closed' })

        await expect(
            actions.reissue_link(makeEvent(undefined, { eventId: otherYear })),
        ).rejects.toMatchObject({ status: 404 })

        expect(mockSendRecovery).not.toHaveBeenCalled()
        expect((await registrationRow()).managementToken).toBe(
            hashManagementToken(seeded.managementToken),
        )
    })
})
