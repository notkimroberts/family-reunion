import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

/* Pins /register/manage against the silent-failure pattern this project keeps producing: an action
   succeeds, the database is correct, and the page goes on rendering what it loaded beforehand.

   Two distinct mechanisms below, both of which reached a browser:

   - a use:enhance callback that never calls update(), so nothing re-renders (the dialogs);
   - a mount-time $state copy of load data that never re-reads it (the status).

   On the first: returning a callback from use:enhance REPLACES SvelteKit's default handler, and the
   default is what runs applyAction + invalidateAll. Omit update() and the action still succeeds — the
   write lands, the dialog closes, and the page keeps rendering the data it loaded before the edit. To
   the registrant, saving a birthday, shirt size or meal answer did nothing until they refreshed by
   hand, and nothing on screen suggested they should.

   Nothing else catches either one. The types are satisfied, the actions' own tests pass, and the
   mutation is genuinely persisted — the defect is only visible in a browser, one interaction later.

   Comments are stripped before matching, because these components explain the traps in prose and a
   raw match cannot tell an explanation from the code it warns about. */

const DIALOGS = [
    { name: 'EditMemberDialog', path: 'src/routes/(app)/register/EditMemberDialog.svelte' },
    { name: 'RemoveMemberDialog', path: 'src/routes/(app)/register/RemoveMemberDialog.svelte' },
]

function code(path: string): string {
    return readFileSync(path, 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
}

describe('manage dialogs re-render after a successful action', () => {
    /* The guards below are source matches against a path, so a component that moves would take them
       with it silently. Prove each file really is an enhanced form first. */
    it.each(DIALOGS)('$name posts through use:enhance', ({ path }) => {
        expect(code(path)).toMatch(/use:enhance/)
    })

    it.each(DIALOGS)('$name awaits update() so the party table re-renders', ({ path }) => {
        expect(code(path)).toMatch(/await update\(/)
    })

    /* Closing the dialog is not the same as applying the result. This was the whole bug in
       EditMemberDialog: it set open = false on success and returned. */
    it.each(DIALOGS)('$name does not close without applying the result', ({ path }) => {
        const source = code(path)
        const closesDialog = /open = false/.test(source)
        if (closesDialog) {
            expect(source).toMatch(/await update\(/)
        }
    })

    /* The edit form binds every field to local $state, so form.reset() would return the DOM inputs
       to their HTML defaults while the state kept the new values — the two would disagree the next
       time the dialog opened. */
    it('EditMemberDialog does not reset the form it just posted', () => {
        expect(code('src/routes/(app)/register/EditMemberDialog.svelte')).toMatch(
            /update\(\{ reset: false \}\)/,
        )
    })
})

/* The other half of the same complaint, by a different mechanism.

   Cancelling a registration redirects back to /register/manage, and the load DOES re-run: enhance
   passes a redirect to applyAction, which calls _goto with invalidateAll. But the page held the
   status in a mount-time `$state(untrack(() => data.registration.status))` copy and never read `data`
   again, so the 'refunded' branch could not render. The confirmation dialog stayed on screen over a
   page still saying "You're registered!", and only a hard refresh — a fresh mount, hence a fresh
   copy — told the truth.

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
