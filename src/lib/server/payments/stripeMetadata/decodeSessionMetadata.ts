import type { StripeSessionMetadata } from './types'

/* Parses raw Stripe session metadata into a typed StripeSessionMetadata; returns null when
   any required field is missing. Fail-closed — never default a token or id to '' since
   downstream consumers (manageUrl construction, party_member writes) trust the value
   without re-validating. */
export function decodeSessionMetadata(
    raw: Record<string, string> | null | undefined,
): StripeSessionMetadata | null {
    if (!raw) {
        return null
    }
    if (raw.type === 'registration') {
        if (!raw.registrationId || !raw.managementToken) {
            return null
        }
        return {
            type: 'registration',
            registrationId: raw.registrationId,
            managementToken: raw.managementToken,
        }
    }
    if (raw.type === 'add_member') {
        if (
            !raw.registrationId ||
            !raw.memberName ||
            !raw.memberTierId ||
            !raw.memberTierLabel ||
            !raw.memberPriceCents
        ) {
            return null
        }
        return {
            type: 'add_member',
            registrationId: raw.registrationId,
            memberName: raw.memberName,
            memberTierId: raw.memberTierId,
            memberTierLabel: raw.memberTierLabel,
            memberBirthDate: raw.memberBirthDate ?? '',
            memberShirtSize: raw.memberShirtSize ?? '',
            memberAddressLine1: raw.memberAddressLine1 ?? '',
            memberAddressLine2: raw.memberAddressLine2 ?? '',
            memberAddressCity: raw.memberAddressCity ?? '',
            memberAddressState: raw.memberAddressState ?? '',
            memberAddressZip: raw.memberAddressZip ?? '',
            memberVegetarianMeal: raw.memberVegetarianMeal ?? '',
            memberAttendedReunion2025: raw.memberAttendedReunion2025 ?? '',
            memberPriceCents: raw.memberPriceCents,
        }
    }
    return null
}
