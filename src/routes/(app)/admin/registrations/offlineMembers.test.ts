import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

/* Guards the defining property of admin add-member: it must never take a payment.

   Deliberately imports nothing from the app. An earlier version of this check lived inside the
   route's action test, and wiring the payments module into the action broke that file's import
   graph — so the suite reported "no tests" instead of a failed assertion. Red either way, but a
   confusing signal for whoever hits it. A pure source-inspection test fails with a readable
   message instead.

   Comments are stripped first: both files explain in prose why they avoid checkout/addMember and
   the payments module, and matching raw source cannot tell a mention in a comment from an import. */
const codeOnly = (path: string) =>
    readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')

const ACTION = 'src/routes/(app)/admin/registrations/[id]/+page.server.ts'
const IMPL = 'src/lib/server/registrations/management/addAdminMember.ts'

describe('admin add-member stays offline', () => {
    it('the route action does not reach Stripe', () => {
        const source = codeOnly(ACTION)
        expect(source, 'admin add-member must not import the payments module').not.toMatch(
            /\$lib\/server\/payments/,
        )
        /* checkout/addMember always opens a Stripe session and rejects non paid/waived — reusing
           it here would charge a family who is paying by cheque. */
        expect(source, 'must use addAdminMember, not checkout/addMember').not.toMatch(
            /\baddMember\b/,
        )
        expect(source).toMatch(/addAdminMember/)
    })

    it('addAdminMember snapshots the net tier price and never grosses up', () => {
        const source = codeOnly(IMPL)
        expect(source).not.toMatch(/\$lib\/server\/payments/)
        /* A Stripe gross-up here would put an offline addition on a different price basis from the
           rest of an admin-entered party. */
        expect(source).not.toMatch(/grossUpForStripe/)
        expect(source).toMatch(/pricing\.priceCents/)
    })
})
