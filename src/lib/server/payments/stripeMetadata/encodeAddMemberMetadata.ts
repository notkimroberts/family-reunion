import type { AddMemberMetadataParams } from './types'

/* KEPT WITHOUT A PRODUCTION CALLER. createAddMemberCheckout was deleted with self-service
   add-a-member, so nothing encodes this any more — but fulfillCheckout still decodes it, for sessions
   Stripe may redeliver from before the removal. This is how that branch's tests build metadata in the
   shape Stripe actually held, rather than hand-rolling a fixture that can drift from it. */
export function encodeAddMemberMetadata(params: AddMemberMetadataParams): Record<string, string> {
    return {
        type: 'add_member',
        registrationId: params.registrationId,
        memberName: params.memberName,
        memberTierId: params.memberTierId,
        memberTierLabel: params.memberTierLabel,
        memberBirthDate: params.memberBirthDate ?? '',
        memberShirtSize: params.memberShirtSize ?? '',
        memberAddressLine1: params.memberAddressLine1 ?? '',
        memberAddressLine2: params.memberAddressLine2 ?? '',
        memberAddressCity: params.memberAddressCity ?? '',
        memberAddressState: params.memberAddressState ?? '',
        memberAddressZip: params.memberAddressZip ?? '',
        memberVegetarianMeal:
            params.memberVegetarianMeal === undefined ? '' : String(params.memberVegetarianMeal),
        memberAttendedReunion2025:
            params.memberAttendedReunion2025 === undefined
                ? ''
                : String(params.memberAttendedReunion2025),
        memberPriceCents: String(params.memberPriceCents),
    }
}
