import { error } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'
import { createAddMemberCheckout } from '$lib/server/payments'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import { getRegistrationByToken } from '../queries/getRegistrationByToken'
import { resolveCategoryPricing } from './_resolveCategoryPricing'

/* Validates ownership via plaintext management token (compared by hash) and looks up the
   category's price on the event, then creates a Stripe Checkout for a single additional member.
   Rejects refunded/pending registrations — only paid or waived may add members. */
export async function addMember(params: {
    registrationId: string
    managementToken: string
    name: string
    category: RegistrationCategory
    birthDate?: string
    shirtSize?: string
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

    const pricingByCategory = await resolveCategoryPricing(registration.eventId, [params.category])
    const pricing = pricingByCategory[params.category]

    dbg.register('add_member registrationId=%s name=%s', params.registrationId, params.name)

    /* Gross up so the org nets the category's intended price after Stripe's fee. The gross
       amount is what gets charged AND what gets snapshotted onto party_members.priceCents
       via the webhook, so refund math (which reads priceCents) refunds what the customer paid. */
    return createAddMemberCheckout({
        name: params.name,
        tierLabel: pricing.label,
        priceCents: grossUpForStripe(pricing.priceCents),
        registrationId: params.registrationId,
        memberTierId: params.category,
        memberBirthDate: params.birthDate,
        memberShirtSize: params.shirtSize,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })
}
