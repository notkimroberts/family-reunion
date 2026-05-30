export function encodeAddMemberMetadata(params: {
    registrationId: string
    memberName: string
    memberTierId: string
    memberBirthDate?: string
    memberShirtSize?: string
    memberPriceCents: number
}): Record<string, string> {
    return {
        type: 'add_member',
        registrationId: params.registrationId,
        memberName: params.memberName,
        memberTierId: params.memberTierId,
        memberBirthDate: params.memberBirthDate ?? '',
        memberShirtSize: params.memberShirtSize ?? '',
        memberPriceCents: String(params.memberPriceCents),
    }
}
