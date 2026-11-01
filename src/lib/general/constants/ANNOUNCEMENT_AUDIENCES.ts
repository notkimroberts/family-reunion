/* Who an owner's email to the families can go to. Shared by the Postgres enum and the form schema,
   so the two cannot drift — and here, not in the db schema, so the page can import it. */
export const ANNOUNCEMENT_AUDIENCES = ['confirmed', 'everyone_active'] as const
