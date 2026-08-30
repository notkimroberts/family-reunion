/* A phone number as an E.164 URI value, for `tel:` and `sms:` hrefs.

   CONTACT_PHONE is stored the way it should be READ — "(510) 575-9080" — and that string was being
   dropped straight into hrefs, producing `tel:(510) 575-9080`. Spaces and parens are not valid in a
   URI, and Resend's insights flagged it; some clients mangle it, others silently drop the link.

   The same number had three spellings across the app: raw in the emails and on two register pages,
   and digits-only via an inline `.replace(/[^\d+]/g, '')` on the home page — which produced
   `5105759080` with no country code. One function, so display and href cannot drift again.

   Assumes +1 for a bare ten-digit number. The reunion is in the US and US_STATES already makes that
   assumption; anything already in international form is passed through untouched. */
export function toE164(phone: string): string {
    const trimmed = phone.trim()
    const digits = trimmed.replace(/\D/g, '')

    if (trimmed.startsWith('+')) {
        return `+${digits}`
    }
    /* 11 digits starting with 1 is a US number that already carries its country code. */
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`
    }
    if (digits.length === 10) {
        return `+1${digits}`
    }
    /* Not a shape we recognise. Return the digits rather than guessing a country code onto them —
       a wrong prefix dials the wrong person, an unprefixed number just fails to dial. */
    return digits
}
