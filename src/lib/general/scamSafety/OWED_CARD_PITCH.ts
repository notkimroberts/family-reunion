/* The ask for money owed on a paid booking, leading with the card: it settles itself, while Zelle and
   checks wait for an organizer to notice the money and mark it. Shared by the payment email and the
   registrant's page, so the two cannot drift. It does not call the checkout "secure" — the Pay button
   it sits beside carries STRIPE_CHECKOUT_NOTE, which names the site instead. */
export const OWED_CARD_PITCH =
    'Pay by card now. It takes a minute, and a confirmation email follows straight away.'
