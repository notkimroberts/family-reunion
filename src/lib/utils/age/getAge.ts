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
