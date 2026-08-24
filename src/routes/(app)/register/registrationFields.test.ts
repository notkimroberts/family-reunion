import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'
import { adminRegistrationSchema, registrationSchema } from './schema'

/* Guards the wiring between the schema and the DOM.

   Both production bugs on these forms came from the same gap: the schema requires a field, but no
   input actually emits it. Types cannot catch that — the values travel as form-encoded strings —
   and neither could the server tests, which build FormData by hand and so encode the same
   assumption they are meant to check.

   So this reads the real components and asserts every required key has a home. */

const HIDDEN_FIELDS = readFileSync(
    'src/routes/(app)/register/RegistrationHiddenFields.svelte',
    'utf8',
)
const CONTACT_CARD = readFileSync('src/routes/(app)/register/YourInformationCard.svelte', 'utf8')
const ORDER_SUMMARY = readFileSync('src/routes/(app)/register/OrderSummaryCard.svelte', 'utf8')

/* Every name="..." rendered anywhere in the registration UI. */
const emittedNames = new Set(
    [HIDDEN_FIELDS, CONTACT_CARD, ORDER_SUMMARY]
        .flatMap((source) => [...source.matchAll(/name="([^"]+)"/g)])
        .map((match) => match[1]),
)

function requiredKeys(schema: typeof registrationSchema | typeof adminRegistrationSchema) {
    /* A key is required if the schema rejects the object when that key is absent. */
    const complete: Record<string, unknown> = {
        eventId: 'e1',
        contactName: 'A B',
        contactEmail: 'a@b.com',
        contactPhone: '',
        selfTierId: 't1',
        selfBirthDate: '',
        selfShirtSize: '',
        selfAddressLine1: '1 St',
        selfAddressLine2: '',
        selfAddressCity: 'SF',
        selfAddressState: 'CA',
        selfAddressZip: '94612',
        selfVegetarianMeal: 'no',
        selfAttendedReunion2025: 'no',
        members: '[]',
        status: 'paid',
    }
    return Object.keys(complete).filter((key) => {
        const withoutKey = { ...complete }
        delete withoutKey[key]
        return !schema.safeParse(withoutKey).success
    })
}

describe('every required schema field is emitted by some input', () => {
    it('public registration', () => {
        for (const key of requiredKeys(registrationSchema)) {
            expect(emittedNames, `no input renders name="${key}"`).toContain(key)
        }
    })

    it('admin paper entry', () => {
        for (const key of requiredKeys(adminRegistrationSchema)) {
            expect(emittedNames, `no input renders name="${key}"`).toContain(key)
        }
    })

    /* The two fields the contact card owns. If they ever move to the shared hidden fields as
       well, the FormData would carry each name twice — this pins the split. */
    it('contactEmail and contactPhone come from the card, not the hidden fields', () => {
        expect(CONTACT_CARD).toContain('name="contactEmail"')
        expect(HIDDEN_FIELDS).not.toContain('name="contactEmail"')
        expect(HIDDEN_FIELDS).not.toContain('name="contactPhone"')
    })

    it('status is emitted by the order summary, only where it is shown', () => {
        expect(ORDER_SUMMARY).toContain('name="status"')
    })
})
