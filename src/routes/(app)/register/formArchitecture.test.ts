import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { EMPTY_PERSON_DETAILS } from './EMPTY_PERSON_DETAILS'
import { adminRegistrationSchema, registrationSchema } from './schema'

/* Pins the architecture that two production bugs came out of.

   Note on what is achievable here. superforms' $form is a Svelte STORE, not $state, so $form.self
   is a plain object and binding to its nested properties is untrackable — Svelte warns
   "binding_property_non_reactive" and edits silently do not stick. superforms offers only
   store-based fieldProxy for nested paths, which would mean ten props on a card designed to take
   one. So the editing surface is $state and there is exactly ONE sync into $form, in onSubmit,
   which superforms runs before client validation. That is one mechanical assignment instead of
   thirteen hand-maintained hidden inputs.

   Previously these forms split their data between $form and unbound hidden inputs. A field missing
   from $form made superforms cancel every submit with no request (it validates the store, not the
   DOM). A field missing from the DOM produced an incomplete POST, which came back as a partial
   $form and crashed the page. Both were invisible to types, because form values are strings in the
   DOM and the mirroring was done by hand.

   $form is now the single source of truth: dataType 'json' posts the store verbatim, so there is
   no DOM copy to drift. These tests exist so that cannot quietly be undone. */

const PAGES = [
    { name: 'public register', path: 'src/routes/(app)/register/+page.svelte' },
    {
        name: 'admin paper entry',
        path: 'src/routes/(app)/admin/event/[eventId]/registrations/new/+page.svelte',
    },
]

/* Every guard below is a source match against a path, so a page that MOVES takes its guards with
   it silently: the negative assertions ("no hidden inputs") keep passing against whatever file now
   sits at the old path. That happened — the admin form moved to new/ and the guard began reading
   the registrations list page, which trivially satisfied it. So first prove each path really is a
   superforms page before trusting anything else said about it. */

/* $form's shape at first render, per each load's defaults(). */
const BLANK_FORM = {
    eventId: 'evt-1',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    self: { ...EMPTY_PERSON_DETAILS },
    members: [],
    stayingAtHostHotel: '',
}

const COMPLETE_FORM = {
    ...BLANK_FORM,
    contactFirstName: 'Alice',
    contactLastName: 'Patterson',
    contactEmail: 'alice@example.com',
    /* Required on the public form: the room block is guesswork without it. */
    stayingAtHostHotel: 'undecided',
    self: {
        ...EMPTY_PERSON_DETAILS,
        tierId: 'tier-adult',
        shirtSize: 'L',
        addressLine1: '123 Fake Street',
        addressCity: 'Oakland',
        addressState: 'CA',
        addressZip: '94612',
        vegetarianMeal: 'no' as const,
        attendedReunion2025: 'yes' as const,
    },
}

describe('$form is the single source of truth', () => {
    it.each(PAGES)('$name is a superforms page at the expected path', ({ path }) => {
        expect(readFileSync(path, 'utf8')).toMatch(/superForm\(/)
    })

    it.each(PAGES)('$name posts the store as JSON, not DOM form data', ({ path }) => {
        expect(readFileSync(path, 'utf8')).toMatch(/dataType: 'json'/)
    })

    /* The inverse of the old guard. Validators were previously forbidden because they could never
       pass; now they must be present, because they are the only pre-submit check. */
    it.each(PAGES)('$name validates on the client', ({ path }) => {
        expect(readFileSync(path, 'utf8')).toMatch(/validators: zodClient\(/)
    })

    /* Any reappearance of a hidden input means state is being mirrored into the DOM again — the
       exact pattern both bugs came from. */
    it.each(PAGES)('$name has no hidden inputs mirroring state', ({ path }) => {
        expect(readFileSync(path, 'utf8')).not.toMatch(/type="hidden"/)
    })

    /* The single sync point. Without it $form never receives self/members, client validation
       cancels every submit, and the JSON post carries blanks — the first bug, exactly. */
    it.each(PAGES)('$name syncs the editing state into $form on submit', ({ path }) => {
        const source = readFileSync(path, 'utf8')
        expect(source).toMatch(/onSubmit: \(\) => \{/)
        expect(source).toMatch(/\$form\.self = \{ \.\.\.self \}/)
        expect(source).toMatch(/\$form\.members = members\.map/)
    })

    /* The old architecture's defining failure: $form could not satisfy the schema no matter what
       the user typed, so client validation always cancelled. It can now. */
    it('a filled $form satisfies the schema', () => {
        const result = registrationSchema.safeParse(COMPLETE_FORM)
        expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
    })

    it('a filled $form satisfies the admin schema too', () => {
        expect(
            adminRegistrationSchema.safeParse({ ...COMPLETE_FORM, status: 'paid' }).success,
        ).toBe(true)
    })

    /* Validation still has to be meaningful — the blank starting state must be rejected, and on
       the fields the user has not filled in. */
    it('the blank starting state is rejected on the expected fields', () => {
        const result = registrationSchema.safeParse(BLANK_FORM)
        expect(result.success).toBe(false)
        const failed = new Set(result.error!.issues.map((issue) => issue.path.join('.')))
        for (const field of [
            'contactFirstName',
            'contactLastName',
            'contactEmail',
            'self.tierId',
            'self.addressLine1',
            'self.addressCity',
            'self.addressState',
            'self.addressZip',
            'self.shirtSize',
            /* vegetarianMeal is NOT here: it is seeded 'no', so a blank form already satisfies it.
               See EMPTY_PERSON_DETAILS for the tradeoff that buys. */
            'self.attendedReunion2025',
        ]) {
            expect(failed, `expected ${field} to be rejected`).toContain(field)
        }
    })

    /* An empty party is valid — registering only yourself is the common case. */
    it('accepts a party of one', () => {
        expect(registrationSchema.safeParse({ ...COMPLETE_FORM, members: [] }).success).toBe(true)
    })

    it('rejects a member who has not answered the questions', () => {
        const result = registrationSchema.safeParse({
            ...COMPLETE_FORM,
            members: [{ ...COMPLETE_FORM.self, name: 'Marcus', vegetarianMeal: '' }],
        })
        expect(result.success).toBe(false)
        expect(
            result.error!.issues.some((i) => i.path.join('.') === 'members.0.vegetarianMeal'),
        ).toBe(true)
    })

    /* Collapsing the contact card unmounts its inputs. Under the old DOM-mirroring architecture
       that silently dropped contactEmail from the POST and crashed the page; the card needed
       hidden fallbacks to compensate. Posting $form as JSON makes mounting irrelevant, so those
       fallbacks are gone — and must not come back, since they would signal a return to mirroring. */
    it('the contact card needs no hidden fallbacks', () => {
        const card = readFileSync('src/routes/(app)/register/YourInformationCard.svelte', 'utf8')
        expect(card).not.toMatch(/type="hidden"/)
    })

    /* EMPTY_PERSON_DETAILS must stay assignable to the store, which means the schema's input type
       has to keep admitting the unanswered '' — attendedReunion2025 still starts there. */
    it('the blank details constant is a valid starting value', () => {
        expect(EMPTY_PERSON_DETAILS.attendedReunion2025).toBe('')
    })

    /* Pre-answered on purpose, so nobody has to declare a dietary preference they do not have. The
       value must be 'no' and not '' — a blank would put the field back in the way of every submit —
       and it must be a value the schema accepts, or the form could never be sent at all. */
    it('pre-answers the vegetarian question as no', () => {
        expect(EMPTY_PERSON_DETAILS.vegetarianMeal).toBe('no')
        expect(
            registrationSchema.safeParse({
                ...BLANK_FORM,
                contactFirstName: 'Alice',
                contactLastName: 'Patterson',
                contactEmail: 'alice@example.com',
                stayingAtHostHotel: 'no',
                self: {
                    ...EMPTY_PERSON_DETAILS,
                    tierId: 'tier-adult',
                    shirtSize: 'L',
                    addressLine1: '123 Fake Street',
                    addressCity: 'Oakland',
                    addressState: 'CA',
                    addressZip: '94612',
                    attendedReunion2025: 'yes',
                },
            }).success,
        ).toBe(true)
    })

    /* The seed has to reach the party builder too — a party of four must not mean four dietary
       questions. That component keeps its own `new*` state, so it had its own hard-coded '' and its own
       Save gate requiring an answer; both now read EMPTY_PERSON_DETAILS. Source-matched because the
       state is internal to the component and not reachable from a unit test. */
    it('the party-member form seeds its answers from the shared constant', () => {
        const source = readFileSync(
            'src/routes/(app)/register/PartyMembersBuilder.svelte',
            'utf8',
        ).replace(/\/\*[\s\S]*?\*\//g, '')

        expect(source).toMatch(
            /newVegetarianMeal = \$state<[^>]+>\(EMPTY_PERSON_DETAILS\.vegetarianMeal\)/,
        )
        /* And Save must no longer demand it, or the default buys nothing. */
        expect(source).not.toMatch(/!!newVegetarianMeal/)
        /* The question with no defensible default is still asked. */
        expect(source).toMatch(/!!newAttendedReunion2025/)
    })
})
