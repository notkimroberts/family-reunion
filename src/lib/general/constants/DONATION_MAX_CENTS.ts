/* A ceiling on the custom amount, so a mistyped figure is refused by the form rather than sent to
   Stripe. $10,000 is far above any realistic family gift and far below anything a typo produces. */
export const DONATION_MAX_CENTS = 1_000_000
