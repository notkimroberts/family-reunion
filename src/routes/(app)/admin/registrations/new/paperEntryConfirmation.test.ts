import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

/* The confirmation banner and the entry form must never be on screen together.

   The form used to stay populated behind the banner after a successful submit, so it was unclear
   whether anything had saved. Hiding it introduced the mirror-image bug: "Add another" brought a
   blank form back but left the previous registrant's confirmation above it, complete with their
   management link — the wrong link to hand to the next person.

   Both are now gated on one derived value, `confirmation`, so neither can be shown without the
   other being hidden. A source guard rather than a rendered assertion because vitest runs in a node
   environment here with no svelte plugin, so the component cannot be compiled in a test. */
const PAGE = 'src/routes/(app)/admin/registrations/new/+page.svelte'

describe('paper entry confirmation', () => {
    it('gates the banner and the form on the same derived value', () => {
        const source = readFileSync(PAGE, 'utf8')

        expect(source).toMatch(/let confirmation = \$derived\(/)
        expect(source).toMatch(/let showForm = \$derived\(!confirmation\)/)
        expect(source).toMatch(/\{#if confirmation\}/)
        expect(source).toMatch(/\{#if showForm\}/)
    })

    /* The specific regression: gating the banner on the action result alone ignores "Add another",
       since actionData persists after the action returns. */
    it('does not gate the banner on the action result alone', () => {
        const source = readFileSync(PAGE, 'utf8')
        expect(source, 'the banner must account for "Add another"').not.toMatch(
            /\{#if actionData\??\.?success\}/,
        )
    })

    /* "Add another" has to clear the copied-link state too, or the next registrant's link renders
       under a "Copied" button that refers to the previous one. */
    it('resets the copy state when starting another entry', () => {
        const source = readFileSync(PAGE, 'utf8')
        const reset = source.slice(source.indexOf('function handleReset()'))
        expect(reset).toMatch(/copied = false/)
        expect(reset).toMatch(/addingAnother = true/)
    })
})
