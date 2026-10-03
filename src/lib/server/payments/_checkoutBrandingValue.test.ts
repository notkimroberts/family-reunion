import { describe, expect, it } from 'vitest'
import { checkoutBrandingValue } from './_checkoutBrandingValue'

/* Stripe validates the suffix when the session is created, so a bad one fails every checkout of that
   kind at the moment someone tries to pay. */
const MAX_SUFFIX_LENGTH = 10
const FORBIDDEN_CHARACTERS = /[<>\\'"*]/

describe('checkoutBrandingValue', () => {
    it.each(Object.entries(checkoutBrandingValue))(
        '%s suffix is one Stripe accepts',
        (_kind, { statementDescriptorSuffix }) => {
            expect(statementDescriptorSuffix.length).toBeLessThanOrEqual(MAX_SUFFIX_LENGTH)
            expect(statementDescriptorSuffix).toMatch(/[A-Z]/)
            expect(statementDescriptorSuffix).toMatch(/^[\x20-\x7E]+$/)
            expect(statementDescriptorSuffix).not.toMatch(FORBIDDEN_CHARACTERS)
        },
    )
})
