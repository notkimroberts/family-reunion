import { describe, expect, it } from 'vitest'
import { ZELLE_RECIPIENT } from '$lib/general/constants'
import { paymentSafetyCopyValue } from '$lib/general/scamSafety'
import { emailPreviewFixtures } from '../../../../../scripts/emailPreviewFixtures'

/* Every email a registrant or donor can receive carries the scam warning, in both bodies. Driven by
   the preview fixtures, which already list every variant, so a new template that leaves the warning
   out fails here rather than in someone's inbox. */
describe('scam warning in every email', () => {
    it.each(emailPreviewFixtures('https://example.com'))('$name', ({ render }) => {
        const { text, html } = render()

        for (const body of [text, html]) {
            expect(body).toContain(paymentSafetyCopyValue.heading)
            expect(body).toContain(ZELLE_RECIPIENT)
            expect(body).toContain(paymentSafetyCopyValue.neverAskedFor[0])
        }
    })
})
