/* The answers to "will your party stay at the host hotel?".

   THREE, not two, because the question is asked months ahead and a forced yes/no gets guesses — and a
   guess is worse than a gap in a figure the organiser uses to hold rooms. 'undecided' means asked and
   genuinely unsure, which is what tells them "N parties might".

   Shared by the Postgres enum (`hotel_stay`), the registration form's zod schema and the admin
   summary, so the three cannot drift. The wording shown to a registrant is NOT here: the form says
   "No, we have somewhere else" and the admin column says "Elsewhere", and one label map would fit
   neither. */
export const HOTEL_STAY_ANSWERS = ['yes', 'no', 'undecided'] as const

export type HotelStayAnswer = (typeof HOTEL_STAY_ANSWERS)[number]
