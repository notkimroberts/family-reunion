import { getStripe } from '$lib/server/stripe'
import { buildStripeLineItem } from './_buildStripeLineItem'
import { encodeAddMemberMetadata } from './stripeMetadata'

export async function createAddMemberCheckout(params: {
    name: string
    tierLabel: string
    priceCents: number
    registrationId: string
    memberTierId: string
    memberBirthDate?: string
    memberShirtSize?: string
    successUrl: string
    cancelUrl: string
}): Promise<string> {
    const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            buildStripeLineItem({
                name: `${params.name} (${params.tierLabel})`,
                priceCents: params.priceCents,
            }),
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: encodeAddMemberMetadata({
            registrationId: params.registrationId,
            memberName: params.name,
            memberTierId: params.memberTierId,
            memberBirthDate: params.memberBirthDate,
            memberShirtSize: params.memberShirtSize,
            memberPriceCents: params.priceCents,
        }),
    })
    return session.url!
}
