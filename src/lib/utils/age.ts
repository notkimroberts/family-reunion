export function getAge(
    birthYear: number,
    birthMonth?: number | null,
    birthDay?: number | null,
): number {
    const today = new Date()
    const currentYear = today.getFullYear()

    if (!birthMonth) {
        return currentYear - birthYear
    }

    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    let age = currentYear - birthYear
    if (
        currentMonth < birthMonth ||
        (currentMonth === birthMonth && currentDay < (birthDay ?? 1))
    ) {
        age--
    }

    return age
}

export function getAgeFromDate(birthDate: string | Date): number {
    const date = typeof birthDate === 'string' ? new Date(birthDate + 'T00:00:00') : birthDate
    const now = new Date()
    let age = now.getFullYear() - date.getFullYear()
    const m = now.getMonth() - date.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
        age--
    }
    return age
}
