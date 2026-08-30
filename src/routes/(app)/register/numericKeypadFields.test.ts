import { readFileSync, readdirSync } from 'fs'
import { describe, it, expect } from 'vitest'

/* A field that wants digits must ask for the digit keypad.

   On a phone the keyboard is chosen by the input, and getting it wrong is not cosmetic: a ZIP code on
   `type="text"` opened the full QWERTY, so entering five digits meant finding the "123" key first, on
   the one form the whole reunion depends on. `inputmode` is the control for this — it picks the
   keyboard and touches nothing else.

   `type="number"` is NOT the fix for an identifier. It strips a leading zero, which deletes the first
   digit of every ZIP in New England and New Jersey, and hangs a spinner off a field nobody increments.
   It is right for the tier price, which really is a quantity, and that one gets inputmode="decimal" so
   iOS offers a decimal pad instead of its numbers-and-punctuation layout.

   Phone is already served by type="tel", which selects the keypad on its own — no inputmode needed, and
   this guard asserts the type rather than the attribute so that stays true.

   A source match rather than a rendered-DOM assertion, for the same reason as
   keyboardReachableFields.test.ts: vitest runs in a node environment with no svelte plugin here, so
   components cannot be compiled in tests. */

function sourceOf(path: string): string {
    return readFileSync(path, 'utf8')
}

/* The block of attributes belonging to one <Input ...>, so an assertion cannot be satisfied by an
   attribute that happens to sit on a different field in the same file. */
function inputBlockContaining(source: string, marker: string): string {
    const at = source.indexOf(marker)
    expect(at, `expected to find ${marker}`).toBeGreaterThan(-1)
    const opened = source.lastIndexOf('<Input', at)
    const closed = source.indexOf('/>', at)
    return source.slice(opened, closed)
}

const ADDRESS_FIELDS = 'src/routes/(app)/register/AddressFields.svelte'
const SETTINGS_PAGE = 'src/routes/(app)/admin/event/[eventId]/settings/+page.svelte'
const NEW_EVENT_PAGE = 'src/routes/(app)/admin/event/new/+page.svelte'

/* Every form that collects a postal address renders this one component — the public register form and
   both admin registration forms — so fixing the keyboard here fixes it everywhere. */
describe('ZIP code asks for the digit keypad', () => {
    it('uses inputmode="numeric"', () => {
        const block = inputBlockContaining(sourceOf(ADDRESS_FIELDS), 'autocomplete="postal-code"')

        expect(block).toMatch(/inputmode="numeric"/)
    })

    /* type="number" would silently drop the leading zero of an 0xxxx ZIP. */
    it('is not a number input', () => {
        const block = inputBlockContaining(sourceOf(ADDRESS_FIELDS), 'autocomplete="postal-code"')

        expect(block).not.toMatch(/type="number"/)
    })

    it('is the only address field asking for digits', () => {
        const source = sourceOf(ADDRESS_FIELDS)

        /* Street, city and name are words. If a second inputmode appears here, something that takes
           letters has been given a keypad. */
        expect(source.match(/inputmode=/g)).toHaveLength(1)
    })
})

describe('money and year fields ask for a number keypad', () => {
    it.each([
        ['the tier price fields', SETTINGS_PAGE, /inputmode="decimal"/, 2],
        ['the new-event year field', NEW_EVENT_PAGE, /inputmode="numeric"/, 1],
    ])('%s carry an inputmode', (_label, path, pattern, count) => {
        const matches = sourceOf(path).match(new RegExp(pattern, 'g')) ?? []

        expect(matches).toHaveLength(count)
    })

    /* Every price input on the settings page, not just the two that exist today. */
    it('no priceCents input is left without one', () => {
        const source = sourceOf(SETTINGS_PAGE)
        const priceInputs = [...source.matchAll(/name="priceCents"/g)].map((match) =>
            inputBlockContaining(source, source.slice(match.index, match.index + 20)),
        )

        expect(priceInputs.length).toBeGreaterThan(0)
        for (const block of priceInputs) {
            expect(block).toMatch(/inputmode="decimal"/)
        }
    })
})

/* type="tel" selects the keypad by itself, so these need no inputmode — but they do need to keep the
   type. A well-meaning change to type="text" would put the full keyboard back with nothing to catch it. */
describe('phone fields stay type="tel"', () => {
    const PHONE_FILES = [
        'src/routes/(app)/register/YourInformationCard.svelte',
        'src/routes/(app)/admin/event/[eventId]/registrations/[registrationId]/RegistrationEditForm.svelte',
    ]

    it.each(PHONE_FILES)('%s', (path) => {
        const block = inputBlockContaining(sourceOf(path), 'contactPhone')

        expect(block).toMatch(/type="tel"/)
    })

    /* Catches a phone field added to a form that does not have one yet. */
    it('no registration form collects a phone on a text input', () => {
        const dirs = [
            'src/routes/(app)/register',
            'src/routes/(app)/admin/event/[eventId]/registrations/[registrationId]',
            'src/routes/(app)/admin/event/[eventId]/registrations/new',
        ]

        const offenders = dirs.flatMap((dir) =>
            readdirSync(dir)
                .filter((file) => file.endsWith('.svelte'))
                .filter((file) => {
                    const source = sourceOf(`${dir}/${file}`)
                    if (!source.includes('name="contactPhone"')) {
                        return false
                    }
                    return !inputBlockContaining(source, 'name="contactPhone"').includes(
                        'type="tel"',
                    )
                })
                .map((file) => `${dir}/${file}`),
        )

        expect(offenders, 'these open the full keyboard for a phone number').toEqual([])
    })
})
