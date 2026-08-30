import type { PersonDetails } from './types'

/* Blank contact details, shared so the public form and admin paper entry start from and reset to
   an identical shape. Both previously carried their own literal, which is how a field can silently
   go missing from one of them.

   vegetarianMeal is the one field seeded with an answer rather than left blank. It is pre-set to 'no'
   because most people are not vegetarian and the alternative — every registrant having to answer a
   dietary question about themselves and each of their party — was friction on a public form for an
   answer that is 'no' almost every time.

   THE COST, stated because an earlier pass rejected this exact change for it: a vegetarian who does not
   read the field is now recorded as standard, where before they could not submit without answering. So
   under-ordering vegetarian meals is now possible in a way it was not. What catches it is the admin
   People lens, where the answer is editable in place, and the order sheet, which counts vegetarians
   explicitly rather than inferring them.

   attendedReunion2025 is deliberately NOT seeded. It has no default that is right — a wrong guess either
   way misreports last year's turnout — and leaving it blank keeps the schema's rejection of an
   unanswered form exercised by something. */
export const EMPTY_PERSON_DETAILS: PersonDetails = {
    tierId: '',
    birthDate: undefined,
    shirtSize: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    vegetarianMeal: 'no',
    attendedReunion2025: '',
}
