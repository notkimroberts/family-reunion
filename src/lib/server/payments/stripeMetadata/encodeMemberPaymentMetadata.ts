import { MEMBER_CHARGES_SEPARATORS } from './MEMBER_CHARGES_SEPARATORS'
import type { MemberCharge } from './types'

/* Stripe metadata for a card payment of the places still owed on a paid booking.

   The charges ride in ONE value because Stripe metadata is flat strings. A uuid and a price come to
   about 44 characters, so Stripe's 500-character limit fits eleven people added to one booking after
   it was paid. Past that Stripe rejects the session, which the pay page reports; the organizer can
   record the payment by hand. */
export function encodeMemberPaymentMetadata(params: {
    registrationId: string
    viewToken: string
    charges: readonly MemberCharge[]
}): Record<string, string> {
    const memberCharges = params.charges
        .map((charge) => `${charge.memberId}${MEMBER_CHARGES_SEPARATORS.field}${charge.grossCents}`)
        .join(MEMBER_CHARGES_SEPARATORS.charge)

    return {
        type: 'member_payment',
        registrationId: params.registrationId,
        viewToken: params.viewToken,
        memberCharges,
    }
}
