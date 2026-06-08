/* Stripe's standard US card-present rate: 2.9% + 30¢ per successful charge.
   Single source of truth for any code that needs to gross up a net amount before sending it to Stripe so the org receives the intended net after Stripe takes its cut. */
export const STRIPE_FEE_PERCENT = 0.029
export const STRIPE_FEE_FIXED_CENTS = 30

/* Returns the gross amount (in cents) the customer must be charged so that, after Stripe's
   2.9% + 30¢ fee, the org nets `netCents`. Always rounds up: undercharging by a cent leaves
   the org short. */
export function grossUpForStripe(netCents: number): number {
    if (netCents <= 0) {
        return 0
    }
    return Math.ceil((netCents + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT))
}

/* The fee portion of a grossed-up charge, derived from grossUpForStripe so the two stay
   in lockstep and rounding never disagrees. */
export function stripeFeeCents(netCents: number): number {
    if (netCents <= 0) {
        return 0
    }
    return grossUpForStripe(netCents) - netCents
}
