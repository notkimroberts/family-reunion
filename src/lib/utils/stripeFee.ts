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

/* Stripe's fee on an amount ALREADY charged — 2.9% of the charge plus 30¢, once per charge.

   The inverse direction to the two above, and needed because the admin panel starts from
   registrations.totalCents (what the card was actually charged) rather than from a tier price. Do not
   reach for stripeFeeCents there: it takes a NET amount, so feeding it a gross would compute the fee on
   an amount 2.9% too large.

   ONCE PER CHARGE is the part worth stating. A party of four is grossed up per member, so the charge
   contains 30¢ of fixed fee four times over, while Stripe deducts it once. The org therefore nets
   slightly MORE than intended on a multi-member party — 90¢ on that four — and computing the fee
   per member instead of per registration would hide that by construction.

   An ESTIMATE, and the reason the panel says so. Stripe's real rate is 2.9% + 30¢ for a standard
   domestic card; an international card adds 1.5% and a currency conversion adds more, so the true fee
   can only be read off the balance transaction, which this app does not store. The estimate is a floor:
   the money in the bank is this or less, never more. */
export function stripeFeeOnChargeCents(grossCents: number): number {
    if (grossCents <= 0) {
        return 0
    }
    return Math.round(grossCents * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED_CENTS
}
