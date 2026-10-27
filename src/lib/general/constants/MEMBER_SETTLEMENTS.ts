/* How an organizer settles a place owed on a paid booking by hand: 'paid' for money that came by
   Zelle or check, 'covered' for a place given away.

   Shared by the Postgres enum (`member_settlement`), the admin action's zod schema and the types that
   read the column, so the lists cannot drift — the HOTEL_STAY_ANSWERS pattern. */
export const MEMBER_SETTLEMENTS = ['paid', 'covered'] as const

export type MemberSettlement = (typeof MEMBER_SETTLEMENTS)[number]
