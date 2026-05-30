export type RegistrationSessionMetadata = {
    type: 'registration'
    registrationId: string
}

export type AddMemberSessionMetadata = {
    type: 'add_member'
    registrationId: string
    memberName: string
    memberTierId: string
    memberBirthDate: string
    memberShirtSize: string
    memberPriceCents: string
}

export type StripeSessionMetadata = RegistrationSessionMetadata | AddMemberSessionMetadata

export function encodeRegistrationMetadata(registrationId: string): Record<string, string> {
    return { type: 'registration', registrationId }
}

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

export function decodeSessionMetadata(
    raw: Record<string, string> | null | undefined,
): StripeSessionMetadata | null {
    if (!raw) {
        return null
    }
    if (raw.type === 'add_member') {
        return {
            type: 'add_member',
            registrationId: raw.registrationId ?? '',
            memberName: raw.memberName ?? '',
            memberTierId: raw.memberTierId ?? '',
            memberBirthDate: raw.memberBirthDate ?? '',
            memberShirtSize: raw.memberShirtSize ?? '',
            memberPriceCents: raw.memberPriceCents ?? '0',
        }
    }
    // Handles both new sessions (type: 'registration') and legacy sessions (no type field)
    if (raw.registrationId) {
        return { type: 'registration', registrationId: raw.registrationId }
    }
    return null
}
