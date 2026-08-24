import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'
import { adminRegistrationSchema, registrationSchema } from './schema'

/* Why this file exists.

   Superforms validates the $form STORE on submit, not the DOM — in superForm.js:

       const dataToValidate = opts.formData ?? Data.form

   and the submit path calls it with no formData, then CANCELS the submit when validation
   fails. A cancelled submit produces no network request and no visible error: the button
   simply does nothing.

   Both registration forms carry most of their fields in unbound <input type="hidden">
   elements driven by local $state (`self`, `members`, `status`), so those values never reach
   $form. Passing `validators` to superForm therefore makes the form permanently
   unsubmittable. That shipped, and neither form could be submitted until it was removed.

   Server-side validation is unaffected and remains the authoritative check: dataType 'form'
   posts the real DOM FormData and each action validates it against these same schemas. */

const FORM_PAGES = [
    { name: 'public register', path: 'src/routes/(app)/register/+page.svelte' },
    { name: 'admin paper entry', path: 'src/routes/(app)/admin/registrations/+page.svelte' },
]

/* The $form store as each load's defaults() builds it — everything else is in hidden inputs. */
const PUBLIC_FORM_STORE = {
    eventId: 'evt-1',
    contactName: '',
    contactEmail: 'alice@example.com',
    members: '[]',
}

describe('superforms client validators must stay off the registration forms', () => {
    it.each(FORM_PAGES)('$name does not pass validators to superForm', ({ path }) => {
        expect(readFileSync(path, 'utf8')).not.toMatch(/validators:/)
    })

    /* Demonstrates why: what superforms would validate cannot satisfy the schema, so enabling
       validators can only ever cancel the submit. */
    it('the $form store alone cannot satisfy registrationSchema', () => {
        const result = registrationSchema.safeParse(PUBLIC_FORM_STORE)
        expect(result.success).toBe(false)
        const failed = new Set(result.error!.issues.map((issue) => issue.path.join('.')))
        /* All held in hidden inputs, so absent from $form. */
        for (const field of [
            'selfTierId',
            'selfAddressLine1',
            'selfAddressCity',
            'selfAddressState',
            'selfAddressZip',
            'selfVegetarianMeal',
            'selfAttendedReunion2025',
        ]) {
            expect(failed).toContain(field)
        }
    })

    it('the same holds for the admin schema', () => {
        const result = adminRegistrationSchema.safeParse({ ...PUBLIC_FORM_STORE, status: 'paid' })
        expect(result.success).toBe(false)
    })

    /* A signed-in user supplies contactName, which is why dev looked healthier than production:
       hooks.server.ts substitutes DEV_ADMIN_USER, so locally contactName passed min(1) while an
       anonymous visitor's was ''. The self* fields fail either way. */
    it('still cannot be satisfied when contactName is prefilled', () => {
        const result = registrationSchema.safeParse({
            ...PUBLIC_FORM_STORE,
            contactName: 'Dev Admin',
        })
        expect(result.success).toBe(false)
    })
})

/* Second failure mode on the same forms, from the same root cause: the form's fields are spread
   between page-level hidden inputs and YourInformationCard's live inputs.

   Clicking Save in that card swaps its inputs for a summary, which UNMOUNTED name="contactEmail"
   and name="contactPhone" — the only two fields with no page-level hidden input. The POST then
   omitted them, superValidate returned data with those keys undefined, superforms rebound $form
   from it, and the page's canSubmit crashed on undefined.trim():

       TypeError: undefined is not an object (evaluating 'm().contactEmail.trim')

   The card now renders hidden fallbacks in its saved state. This pins the server half: a POST
   missing those fields must not yield undefined values that a caller would dereference. */
describe('a POST missing contactEmail (card in saved state)', () => {
    const postedAfterSave = {
        eventId: 'evt-1',
        contactName: 'test ing',
        selfTierId: 'tier-adult',
        selfAddressLine1: '123 Fake Street',
        selfAddressCity: 'SF',
        selfAddressState: 'CA',
        selfAddressZip: '12345',
        selfVegetarianMeal: 'yes',
        selfAttendedReunion2025: 'yes',
        members: '[]',
        status: 'paid',
    }

    it('is rejected rather than silently accepted', () => {
        expect(adminRegistrationSchema.safeParse(postedAfterSave).success).toBe(false)
    })

    it('YourInformationCard keeps contactEmail and contactPhone in the DOM when saved', () => {
        const card = readFileSync('src/routes/(app)/register/YourInformationCard.svelte', 'utf8')
        const savedBranch = card.slice(card.indexOf('{#if saved}'), card.indexOf('{:else}'))
        expect(savedBranch).toContain('name="contactEmail"')
        expect(savedBranch).toContain('name="contactPhone"')
    })

    /* Defensive: even if a partial form is ever rebound again, canSubmit must not dereference it. */
    it.each(FORM_PAGES)('$name guards contactEmail against undefined', ({ path }) => {
        expect(readFileSync(path, 'utf8')).toMatch(/\$form\.contactEmail \?\? ''/)
    })
})
