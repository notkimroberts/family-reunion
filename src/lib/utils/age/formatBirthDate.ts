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
