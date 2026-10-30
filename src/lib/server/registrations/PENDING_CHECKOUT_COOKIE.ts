/* Holds the view token of the booking this browser opened on its last Pay at /register, so the next
   Pay replaces it instead of adding another (retirePendingCheckout). Separate from reg_token, which
   names a booking the registrant has opened from their link; overwriting it on every Pay would lose
   that. Scoped to /register and kept for a Checkout session's lifetime. */
export const PENDING_CHECKOUT_COOKIE = 'reg_pending'
