import { describe, expect, it } from 'vitest'
import { CHECK_PAYEE } from './CHECK_PAYEE'
import { REUNION_NAME } from './REUNION_NAME'

/* The payee printed on the site, the paper form and every email must be the name on the PNC deposit
   account, or the bank can refuse to deposit the check. It is not the reunion's public name. */
describe('CHECK_PAYEE', () => {
    it('is the name on the deposit account', () => {
        expect(CHECK_PAYEE).toBe('Patterson Reunion Association')
    })

    it('is not the public-facing reunion name', () => {
        expect(CHECK_PAYEE).not.toBe(REUNION_NAME)
    })
})
