import { isValidPhone, isValidZip } from '$lib/utils'
import type { PersonDetails } from './types'

/* Everything stopping the contact's own details from being saved, named.

   The Save button used to be disabled whenever anything was missing, which said "no" without saying
   why: on a form with an address, a tier, a shirt size and two required questions, a single unanswered
   dropdown below the fold reads as a broken button. The list this returns is rendered in an alert
   above the fields instead, so the answer is on screen.

   Message wording matches registrationSchema's, because these are the same rules — this runs before a
   submit, the schema runs at one, and a registrant should not be told two different things about the
   same empty field. */
export function contactSaveProblems(contact: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    details: PersonDetails
}): string[] {
    const { firstName, lastName, email, phone = '', details } = contact
    const problems: string[] = []

    if (!firstName.trim()) {
        problems.push('First name is required')
    }
    if (!lastName.trim()) {
        problems.push('Last name is required')
    }
    if (!email.trim()) {
        problems.push('Email is required')
    }
    /* Optional, so only a value that is present and wrong is a problem. */
    if (phone.trim() && !isValidPhone(phone)) {
        problems.push('Please enter a valid phone number')
    }
    if (!details.addressLine1.trim()) {
        problems.push('Street address is required')
    }
    if (!details.addressCity.trim()) {
        problems.push('City is required')
    }
    if (!details.addressState.trim()) {
        problems.push('Please select a state')
    }
    if (!details.addressZip.trim() || !isValidZip(details.addressZip)) {
        problems.push('Please enter a valid ZIP code')
    }
    if (!details.tierId) {
        problems.push('Please select a tier')
    }
    if (!details.shirtSize) {
        problems.push('Please choose a T-shirt size')
    }
    if (!details.vegetarianMeal) {
        problems.push('Please say whether you need a vegetarian meal')
    }
    if (!details.attendedReunion2025) {
        problems.push('Please say whether you attended the 2025 New Orleans reunion')
    }

    return problems
}
