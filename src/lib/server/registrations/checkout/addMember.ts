import { error } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'
import { createAddMemberCheckout } from '$lib/server/payments'
import { getRegistrationByToken } from '../queries/getRegistrationByToken'
import { fetchAndValidateTiers } from './_fetchAndValidateTiers'

/* Validates ownership via plaintext management token (compared by hash) and looks up the
   tier on the event, then creates a Stripe Checkout for a single additional member.
   Rejects refunded/pending registrations — only paid or waived may add members. */
export async function addMember(params: {
    registrationId: string
    managementToken: string
    name: string
    tierId: string
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

    const tierMap = await fetchAndValidateTiers(registration.eventId, [params.tierId])
    const tier = tierMap.get(params.tierId)!

    dbg.register('add_member registrationId=%s name=%s', params.registrationId, params.name)

    return createAddMemberCheckout({
        name: params.name,
        tierLabel: tier.label,
        priceCents: tier.priceCents,
        registrationId: params.registrationId,
        memberTierId: params.tierId,
        memberBirthDate: params.birthDate,
        memberShirtSize: params.shirtSize,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })
}
