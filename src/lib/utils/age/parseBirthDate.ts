/* Parses a YYYY-MM-DD string into split integer components.
   Returns null when the input is missing, malformed (wrong shape), or any segment fails
   to parse to a finite integer. NaN must never reach the DB — integer columns reject it
   and a CHECK-passing NULL is preferable to a transaction-failing NaN. */
export function parseBirthDate(
    isoDate: string,
): { birthYear: number; birthMonth: number; birthDay: number } | null {
    if (!isoDate) {
        return null
    }
    const parts = isoDate.split('-').map(Number)
    if (parts.length !== 3) {
        return null
    }
    const [birthYear, birthMonth, birthDay] = parts
    if (!Number.isFinite(birthYear) || !Number.isFinite(birthMonth) || !Number.isFinite(birthDay)) {
        return null
    }
    if (birthYear < 1 || birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
        return null
    }
    return { birthYear, birthMonth, birthDay }
}
