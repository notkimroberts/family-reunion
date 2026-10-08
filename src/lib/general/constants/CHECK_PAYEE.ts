/* Who checks are made out to: the name on the reunion's PNC deposit account. The payee has to match
   a name the bank accepts for that account, or it can refuse the deposit — which is why this is not
   REUNION_NAME, the public-facing name. A check made out to the association cannot be cashed by
   someone posing as an organizer, which is why the scam warning says never to make one out to a
   person. */
export const CHECK_PAYEE = 'Patterson Reunion Association'
