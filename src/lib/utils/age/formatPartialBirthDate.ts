const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

/* Renders a partial birth date for display. Returns undefined when the year is missing. */
export function formatPartialBirthDate(
    birthYear: number | null | undefined,
    birthMonth: number | null | undefined,
    birthDay: number | null | undefined,
): string | undefined {
    if (!birthYear) {
        return undefined
    }
    if (!birthMonth) {
        return String(birthYear)
    }
    const monthName = MONTH_NAMES[birthMonth - 1] ?? String(birthMonth)
    if (!birthDay) {
        return `${monthName} ${birthYear}`
    }
    return `${monthName} ${birthDay}, ${birthYear}`
}
