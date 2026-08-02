import { getAge } from './getAge'
import { parseBirthDate } from './parseBirthDate'

// Parses a birthDate string and returns the member's current age; returns undefined if input is absent or unparseable
export function getMemberAge(birthDate: string | undefined): number | undefined {
    if (!birthDate) {
        return undefined
    }
    const parsed = parseBirthDate(birthDate)
    return parsed ? getAge(parsed.birthYear, parsed.birthMonth, parsed.birthDay) : undefined
}
