import type { PersonDetails } from './types'

/* Blank contact details, shared so the public form and admin paper entry start from and reset to
   an identical shape. Both previously carried their own literal, which is how a field can silently
   go missing from one of them. */
export const EMPTY_PERSON_DETAILS: PersonDetails = {
    tierId: '',
    birthDate: undefined,
    shirtSize: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    vegetarianMeal: '',
    attendedReunion2025: '',
}
