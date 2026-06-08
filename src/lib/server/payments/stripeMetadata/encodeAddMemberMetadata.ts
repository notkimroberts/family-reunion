import type { AddMemberMetadataParams } from './types'

export function encodeAddMemberMetadata(params: AddMemberMetadataParams): Record<string, string> {
    return {
        type: 'add_member',
        registrationId: params.registrationId,
        memberName: params.memberName,
        memberTierId: params.memberTierId,
        memberTierLabel: params.memberTierLabel,
        memberBirthDate: params.memberBirthDate ?? '',
        memberShirtSize: params.memberShirtSize ?? '',
        memberPriceCents: String(params.memberPriceCents),
    }
}
