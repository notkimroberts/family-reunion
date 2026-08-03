export function parseYesNo(value: string | undefined): boolean | undefined {
    if (value === 'yes') {
        return true
    }
    if (value === 'no') {
        return false
    }
    return undefined
}
