import type { StripeSessionMetadata } from './types'

// Parses raw Stripe session metadata into a typed StripeSessionMetadata; returns null if unrecognised or missing
export function decodeSessionMetadata(
    raw: Record<string, string> | null | undefined,
): StripeSessionMetadata | null {
    if (!raw) {
        return null
    }
    if (raw.type === 'registration' && raw.registrationId) {
        return { type: 'registration', registrationId: raw.registrationId }
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
    return null
}
