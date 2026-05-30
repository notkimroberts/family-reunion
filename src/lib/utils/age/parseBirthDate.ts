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
