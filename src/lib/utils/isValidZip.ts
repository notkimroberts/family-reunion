const ZIP_REGEX = /^\d{5}(-\d{4})?$/

// Matches a 5-digit US ZIP code, optionally followed by a ZIP+4 suffix.
export function isValidZip(zip: string): boolean {
    return ZIP_REGEX.test(zip.trim())
}
