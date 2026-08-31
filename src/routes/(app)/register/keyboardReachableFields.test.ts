import { readFileSync, readdirSync } from 'fs'
import { describe, expect, it } from 'vitest'

/* Every form field in the registration path must be reachable by Tab.

   bits-ui's Select renders its trigger as a <button>, and Safari omits buttons from the Tab order
   unless "Press Tab to highlight each item on a webpage" is switched on — which it is not by
   default. So Tab ran City → ZIP straight past the required State field, and the same held for
   tier, vegetarian meal and attended-2025: four required fields a keyboard user could not reach,
   ending at a submit button that stayed disabled with nothing to explain why. The fix is a native
   <select>, which is a Tab stop everywhere.

   This guard is a source match rather than a rendered-DOM assertion because vitest runs in a node
   environment here with no svelte plugin, so components cannot be compiled in tests. It therefore
   pins the import, not the behaviour: any bits-ui Select reintroduced into these files brings the
   Safari skip back with it. */
const REGISTER_DIR = 'src/routes/(app)/register'
/* The admin registration forms are as form-heavy as the public one and reuse the same field
   components, so the same Safari defect applies to them. */
const ADMIN_DIRS = [
    'src/routes/(app)/admin/event/[eventId]/registrations/[registrationId]',
    'src/routes/(app)/admin/event/[eventId]/registrations/new',
]

/* Fields the registrant fills. DatePicker is excluded — it is a Popover with a text input, so the
   input itself is the Tab stop. */
const FIELD_COMPONENTS = [
    'StateSelect.svelte',
    'TierSelect.svelte',
    'YesNoSelect.svelte',
    'ShirtSizeSelect.svelte',
    'OrderSummaryCard.svelte',
]

describe('registration form fields are keyboard reachable', () => {
    it.each(FIELD_COMPONENTS)('%s uses a native select, not bits-ui', (file) => {
        const source = readFileSync(`${REGISTER_DIR}/${file}`, 'utf8')
        expect(source, `${file} must not use bits-ui Select`).not.toMatch(/Select\.Trigger/)
        expect(source).not.toMatch(/from 'bits-ui'/)
    })

    /* The four inline copies of the shirt-size Select are why this is a component now. Catch a new
       inline Select anywhere in the registration form, not just in the files listed above. */
    it.each([REGISTER_DIR, ...ADMIN_DIRS])(
        'no component in %s reintroduces a bits-ui Select',
        (dir) => {
            const offenders = readdirSync(dir)
                .filter((file) => file.endsWith('.svelte'))
                .filter((file) =>
                    /Select\.Trigger|from 'bits-ui'/.test(readFileSync(`${dir}/${file}`, 'utf8')),
                )

            expect(
                offenders,
                'these render a bits-ui Select, unreachable by Tab in Safari',
            ).toEqual([])
        },
    )

    it('the shared native select is styled to match Input and carries its own chevron', () => {
        const source = readFileSync(
            'src/lib/components/ui/native-select/native-select.svelte',
            'utf8',
        )
        expect(source).toMatch(/<select/)
        expect(source).toMatch(/appearance-none/)
        expect(source).toMatch(/ChevronDown/)
    })
})
