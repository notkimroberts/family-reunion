import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

/* Pins the dialogs on /register/manage against the silent-failure pattern this project keeps
   producing: a use:enhance callback that does its own thing and never calls update().

   Returning a callback from use:enhance REPLACES SvelteKit's default handler, and the default is
   what runs applyAction + invalidateAll. Omit update() and the action still succeeds — the write
   lands, the dialog closes, and the page keeps rendering the data it loaded before the edit. To the
   registrant, saving a birthday, shirt size or meal answer did nothing until they refreshed by hand,
   and nothing on screen suggested they should.

   Nothing else catches it. The types are satisfied, the action's own tests pass, and the mutation is
   genuinely persisted — the defect is only visible in a browser, one interaction later.

   Comments are stripped before matching, because these components explain the trap in prose and a
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
