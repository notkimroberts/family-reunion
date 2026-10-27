import { test } from '@playwright/test'
import { readOutbox } from './outbox'

export type Outcome = Record<string, string | number | boolean | null>

/* Records what a scenario observed — amounts in the database, at Stripe and in the emails — as a
   JSON attachment. The outcomes reporter turns every test's attachment into e2e/results/outcomes.md,
   so a run leaves a readable record of what actually happened, pass or fail. */
export async function recordOutcome(facts: Outcome): Promise<void> {
    const emails = (await readOutbox()).map((email) => ({ to: email.to, subject: email.subject }))
    await test.info().attach('outcome', {
        body: JSON.stringify({ facts, emails }, null, 2),
        contentType: 'application/json',
    })
}
