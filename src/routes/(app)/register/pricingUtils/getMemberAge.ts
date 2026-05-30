import { getAge, parseBirthDate } from '$lib/utils/age'

export function getMemberAge(birthDate: string | undefined): number | null {
    if (!birthDate) {
        return null
    }
    const parsed = parseBirthDate(birthDate)
    return parsed ? getAge(parsed.birthYear, parsed.birthMonth, parsed.birthDay) : null
}
