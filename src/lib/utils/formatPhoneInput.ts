// Progressively formats raw digits into a US-style (XXX) XXX-XXXX pattern as the user types.
export function formatPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) {
        return ''
    }
    if (digits.length < 4) {
        return `(${digits}`
    }
    if (digits.length < 7) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
