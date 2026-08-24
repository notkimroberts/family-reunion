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
