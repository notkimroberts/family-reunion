const DATE_RANGE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
})

// Formats a date range, collapsing shared month/year the way native Intl range formatting does
// (e.g. "July 23 – 25, 2027", "July 23 – August 2, 2027", "July 23, 2027" for a single day).
export function formatDateRange(start: Date, end: Date): string {
    return DATE_RANGE_FORMATTER.formatRange(start, end)
}
