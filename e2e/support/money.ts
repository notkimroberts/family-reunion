/* Stripe's US card rate, written out again here on purpose: the tests check the app's prices against
   an independent copy of the rule, not against the app's own grossUpForStripe. */
const FEE_PERCENT = 0.029
const FEE_FIXED_CENTS = 30
/* Radar Standard, billed per card payment outside the charge's balance transaction. */
export const RADAR_FEE_CENTS = 5

/* What a card is charged for a place whose tier price is `netCents`, so the reunion nets the tier
   price after Stripe's cut. Rounded up: a cent short leaves the reunion short. */
export function cardPrice(netCents: number): number {
    return netCents <= 0 ? 0 : Math.ceil((netCents + FEE_FIXED_CENTS) / (1 - FEE_PERCENT))
}

/* "$170.24" — the way the site and the emails print money (formatUsd: no thousands separator). */
export function usd(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
}
