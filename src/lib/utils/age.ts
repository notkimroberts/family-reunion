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

export function parseBirthDate(
    isoDate: string,
): { birthYear: number; birthMonth: number; birthDay: number } | null {
    if (!isoDate) {
        return null
    }
    const parts = isoDate.split('-').map(Number)
    if (parts.length !== 3 || !parts[0]) {
        return null
    }
    return { birthYear: parts[0], birthMonth: parts[1], birthDay: parts[2] }
}

export function formatBirthDate(
    birthYear: number | null | undefined,
    birthMonth: number | null | undefined,
    birthDay: number | null | undefined,
): string | undefined {
    if (!birthYear || !birthMonth || !birthDay) {
        return undefined
    }
    return `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
}
