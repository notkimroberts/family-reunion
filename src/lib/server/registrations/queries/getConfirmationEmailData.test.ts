import { beforeEach, describe, expect, it } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { grossUpForStripe } from '$lib/utils/stripeFee'

/* paidByCard decides whether a 'paid' confirmation says the card went through and that prices carry
   the fee. A paper entry recorded as paid by check must not be told either. */

const { getConfirmationEmailData } = await import('./getConfirmationEmailData')

const VIEW_URL = 'https://example.com/register/view?token=tok'

let db: Awaited<ReturnType<typeof resetTestDb>>

describe('getConfirmationEmailData', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('marks a webhook-paid registration as paid by card', async () => {
        const { registrationId } = await seedRegistration(db, { stripePaymentIntentId: 'pi_1' })

        const result = await getConfirmationEmailData({ registrationId, viewUrl: VIEW_URL })

        expect(result?.data.paidByCard).toBe(true)
    })

    /* A checkout abandoned and later settled by check still has a session id, so the session is not
       the sign of a card — only the intent the webhook writes is. */
    it('marks a paper entry as not paid by card, even with an abandoned checkout session', async () => {
        const { registrationId } = await seedRegistration(db, {
            stripeSessionId: 'cs_abandoned',
            stripePaymentIntentId: null,
        })

        const result = await getConfirmationEmailData({ registrationId, viewUrl: VIEW_URL })

        expect(result?.data.paidByCard).toBe(false)
    })

    /* A card place is stored gross with its fee beside it; the template shows the tier price with the
       fee under it. */
    it('passes the card fee stored on each place', async () => {
        const { registrationId } = await seedRegistration(db, {
            members: [
                {
                    name: 'Alice',
                    priceCents: 17024,
                    cardFeeCents: 524,
                    stripePaymentIntentId: 'pi_1',
                },
                { name: 'Bob', priceCents: 10000 },
            ],
        })

        const result = await getConfirmationEmailData({ registrationId, viewUrl: VIEW_URL })

        expect(result?.data.partyMembers.map((member) => member.cardFeeCents)).toEqual([524, 0])
        expect(result?.data.totalCents).toBe(27024)
    })

    describe('people still owed on a paid booking', () => {
        const MEMBERS = [
            { name: 'Alice Patterson', priceCents: 16509 },
            { name: 'Jada Patterson', priceCents: 10000, paymentDue: true },
        ]

        it('states the amount due and marks who it is for', async () => {
            const { registrationId } = await seedRegistration(db, { members: MEMBERS })

            const result = await getConfirmationEmailData({ registrationId, viewUrl: VIEW_URL })

            expect(result?.data.amountDue).toEqual({
                netCents: 10000,
                cardTotalCents: grossUpForStripe(10000),
                /* Same origin and token as the view link, on the pay page. */
                payUrl: 'https://example.com/register/pay?token=tok',
            })
            expect(result?.data.partyMembers.map((member) => member.detail)).toEqual([
                undefined,
                'Payment needed',
            ])
        })

        it('states nothing when nobody is owed', async () => {
            const { registrationId } = await seedRegistration(db)

            const result = await getConfirmationEmailData({ registrationId, viewUrl: VIEW_URL })

            expect(result?.data.amountDue).toBeUndefined()
        })
    })
})
