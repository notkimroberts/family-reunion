import { getAge, parseBirthDate } from '$lib/utils/age'

export function getMemberAge(birthDate: string | undefined): number | undefined {
    if (!birthDate) {
        return undefined
    }
    const parsed = parseBirthDate(birthDate)
    return parsed ? getAge(parsed.birthYear, parsed.birthMonth, parsed.birthDay) : undefined
}
