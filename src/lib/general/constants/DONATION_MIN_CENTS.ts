/* The smallest gift the form accepts. Stripe's fixed 30¢ makes anything under a few dollars cost
   more to process than it delivers, and a $0 "gift" would open a checkout for nothing. */
export const DONATION_MIN_CENTS = 500
