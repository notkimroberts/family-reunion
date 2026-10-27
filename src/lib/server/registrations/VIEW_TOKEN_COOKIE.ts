/* Holds the registrant's view token after they open their link. Set by /register/view, scoped to
   `/`, and read there, by the status poll and by /register/pay. */
export const VIEW_TOKEN_COOKIE = 'reg_token'
