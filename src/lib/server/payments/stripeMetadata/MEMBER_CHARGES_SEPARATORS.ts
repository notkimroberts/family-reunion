/* How encodeMemberPaymentMetadata packs charges into one Stripe metadata value: "id:cents,id:cents".
   Neither character can occur in a uuid or an integer. */
export const MEMBER_CHARGES_SEPARATORS = { charge: ',', field: ':' } as const
