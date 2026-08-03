import { error } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'
import { createAddMemberCheckout } from '$lib/server/payments'
import { resolveTierPricing } from '$lib/server/tiers'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import { assertRegistrationEditable } from '../assertRegistrationEditable'
import { getRegistrationLockDate } from '../getRegistrationLockDate'
import { getRegistrationByToken } from '../queries/getRegistrationByToken'

/* Validates ownership via plaintext management token (compared by hash) and looks up the
   tier's price on the event, then creates a Stripe Checkout for a single additional member.
   Rejects refunded/pending registrations — only paid or waived may add members. */
export async function addMember(params: {
    registrationId: string
    managementToken: string
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
    addressLine1?: string
    addressLine2?: string
    addressCity?: string
    addressState?: string
    addressZip?: string
    vegetarianMeal?: boolean
    attendedReunion2025?: boolean
    successUrl: string
    cancelUrl: string
}): Promise<string> {
    const registration = await getRegistrationByToken(params.managementToken)
    if (!registration || registration.id !== params.registrationId) {
        throw error(404)
    }
    if (registration.status !== 'paid' && registration.status !== 'waived') {
        throw error(409, 'Cannot add members to a registration that is not active')
    }

    assertRegistrationEditable(await getRegistrationLockDate(registration.eventId))

    const pricingByTierId = await resolveTierPricing(registration.eventId, [params.tierId])
    const pricing = pricingByTierId[params.tierId]

    dbg.register('add_member registrationId=%s name=%s', params.registrationId, params.name)

    /* Gross up so the org nets the tier's intended price after Stripe's fee. The gross
       amount is what gets charged AND what gets snapshotted onto party_members.priceCents
       via the webhook, so refund math (which reads priceCents) refunds what the customer paid. */
    return createAddMemberCheckout({
        name: params.name,
        tierLabel: pricing.label,
        priceCents: grossUpForStripe(pricing.priceCents),
        registrationId: params.registrationId,
        memberTierId: params.tierId,
        memberBirthDate: params.birthDate,
        memberShirtSize: params.shirtSize,
        memberAddressLine1: params.addressLine1,
        memberAddressLine2: params.addressLine2,
        memberAddressCity: params.addressCity,
        memberAddressState: params.addressState,
        memberAddressZip: params.addressZip,
        memberVegetarianMeal: params.vegetarianMeal,
        memberAttendedReunion2025: params.attendedReunion2025,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })
}
