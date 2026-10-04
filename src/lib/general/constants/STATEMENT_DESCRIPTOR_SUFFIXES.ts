/* Appended by Stripe to STATEMENT_DESCRIPTOR_PREFIX, so a card statement reads "PATTERSON* REUNION"
   or "PATTERSON* GIFT". Sent on every Checkout session, and printed in the scam warning so a payer
   recognizes the charge rather than disputing it or believing a "fraud alert" call about it. */
export const STATEMENT_DESCRIPTOR_SUFFIXES = {
    registration: 'REUNION',
    donation: 'GIFT',
}
