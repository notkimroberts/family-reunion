import { isChildTierLabel } from './isChildTierLabel'

/* The tier a contact's dropdown should start on: the first one that is not a child place.

   The person who books and pays for a party is an adult — YourInformationCard already filters the
   child tiers out of their dropdown and both server create paths refuse them — so the blank
   "Select registration tier…" was a click with one sensible answer. Positional rather than a match
   on "Adult": the label is whatever the organiser typed, and the tiers come back in the order the
   settings page lists them, so the first adult place is the ordinary one. */
export function defaultAdultTierId(tiers: readonly { id: string; label: string }[]): string {
    return tiers.find((tier) => !isChildTierLabel(tier.label))?.id ?? ''
}
