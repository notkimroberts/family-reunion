const PHONE_CHARS_REGEX = /^[+]?[\d\s()-]+$/
const MIN_DIGITS = 10 // area code + exchange + subscriber number
const MAX_DIGITS = 15 // E.164 upper bound

// Loose format check for user-entered phone numbers: optional leading +, digits/spaces/dashes/parens,
// and enough digits to include an area code (rejects bare 7-digit local numbers).
export function isValidPhone(phone: string): boolean {
    const trimmed = phone.trim()
    if (!PHONE_CHARS_REGEX.test(trimmed)) {
        return false
    }
    const digitCount = trimmed.replace(/\D/g, '').length
    return digitCount >= MIN_DIGITS && digitCount <= MAX_DIGITS
}
