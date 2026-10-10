import { beforeEach, describe, expect, it } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* paidByCard decides whether a 'paid' confirmation says the card went through and that prices carry
   the fee. A paper entry recorded as paid by cheque must not be told either. */

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

    /* A checkout abandoned and later settled by cheque still has a session id, so the session is not
       the sign of a card — only the intent the webhook writes is. */
    it('marks a paper entry as not paid by card, even with an abandoned checkout session', async () => {
        const { registrationId } = await seedRegistration(db, {
            stripeSessionId: 'cs_abandoned',
            stripePaymentIntentId: null,
        })

        const result = await getConfirmationEmailData({ registrationId, viewUrl: VIEW_URL })

        expect(result?.data.paidByCard).toBe(false)
    })
})
