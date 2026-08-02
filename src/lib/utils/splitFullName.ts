export function splitFullName(name: string): { firstName: string; lastName: string } {
    const trimmed = name.trim()
    const firstSpace = trimmed.indexOf(' ')
    if (firstSpace === -1) {
        return { firstName: trimmed, lastName: '' }
    }
    return {
        firstName: trimmed.slice(0, firstSpace),
        lastName: trimmed.slice(firstSpace + 1).trim(),
    }
}
