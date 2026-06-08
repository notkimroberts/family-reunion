/* Mirrors the DB CHECK on `family_members` / `party_members` birth-date columns:
   month requires a year, day requires a month. Returns an error message string
   or null when the prefix rule is satisfied. */
export function validatePartialBirthDate(
    year: number | null,
    month: number | null,
    day: number | null,
): string | null {
    if (month !== null && year === null) {
        return 'Birth month requires a year'
    }
    if (day !== null && month === null) {
        return 'Birth day requires a month'
    }
    return null
}
