import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

/* Pins /register/manage against the silent-failure pattern this project keeps producing, and
   against the mutations coming back.

   Comments are stripped before matching, because these files explain the traps in prose and a raw
   match cannot tell an explanation from the code it warns about. */

function code(path: string): string {
    return readFileSync(path, 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
}

/* The page is a record, not a control panel. Adding, removing, editing and cancelling are all
   organiser actions now — the registrant's management link buys a view of their own party.

   Worth pinning rather than trusting to review: the deleted actions were reachable with nothing but
   the link, and two of them issued Stripe refunds. Reintroducing a form here is not a UI regression,
   it is self-service money movement. */
describe('the manage page cannot mutate anything', () => {
    it('RegistrationManager posts nothing', () => {
        const source = code('src/routes/(app)/register/RegistrationManager.svelte')
        expect(source).not.toMatch(/method="POST"/i)
        expect(source).not.toMatch(/use:enhance/)
    })

    it('the manage route exports no actions', () => {
        expect(code('src/routes/(app)/register/manage/+page.server.ts')).not.toMatch(
            /export const actions/,
        )
    })
})

/* The other half of the same complaint, by a different mechanism.

   The registrant no longer cancels — an organiser does, from the admin — but the page must still
   show it, and the load returning 'refunded' is the only way it can. The page held the status in a
   mount-time `$state(untrack(() => data.registration.status))` copy and never read `data` again, so
   the 'refunded' branch could not render. The page kept saying "You're registered!" over a booking
   that had been refunded, and only a hard refresh — a fresh mount, hence a fresh copy — told the
   truth.

   A copy like that is invisible to every other check: it type-checks, the action's own tests pass,
   and the database is correct. Only a browser shows it, one interaction in. */
describe('the manage page renders the status the load returned', () => {
    const MANAGE_PAGE = 'src/routes/(app)/register/manage/+page.svelte'

    it('derives the status instead of copying it at mount', () => {
        const source = code(MANAGE_PAGE)
        expect(source).toMatch(/let status = \$derived\(/)
        expect(source, 'a mount-time copy cannot see a cancellation').not.toMatch(
            /let status = \$state\(/,
        )
    })

    /* untrack() around load data is the tell: it exists to silence the warning that the value is
       being read non-reactively, which is the bug rather than the noise. */
    it('does not untrack the load data', () => {
        expect(code(MANAGE_PAGE)).not.toMatch(/untrack/)
    })

    /* The branch that has to appear once a cancellation lands. Pinned because the whole failure was
       that this markup existed and was unreachable. */
    it('has a cancelled branch keyed off that status', () => {
        expect(code(MANAGE_PAGE)).toMatch(/status === 'refunded'/)
    })
})
