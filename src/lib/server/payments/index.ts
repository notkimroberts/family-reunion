import { getStripe } from '$lib/server/stripe'

export type LineItemInput = {
    name: string
    priceCents: number
}

function buildStripeLineItem(item: LineItemInput) {
    return {
        price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: item.priceCents,
        },
        quantity: 1,
    }
}

export async function createRegistrationCheckout(params: {
    lineItems: LineItemInput[]
    registrationId: string
    successUrl: (id: string) => string
    cancelUrl: (id: string) => string
}): Promise<{ url: string; sessionId: string }> {
    console.log(
        '[stripe-debug] creating checkout, httpClient:',
        (getStripe() as any)._httpClient?.constructor?.name ?? 'unknown',
    )
    let session
    try {
        session = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: params.lineItems.map(buildStripeLineItem),
            mode: 'payment',
            success_url: params.successUrl(params.registrationId),
            cancel_url: params.cancelUrl(params.registrationId),
            metadata: { registrationId: params.registrationId },
        })
    } catch (err: any) {
        console.error(
            '[stripe-debug] checkout error:',
            err?.type,
            err?.message,
            'detail:',
            err?.detail,
            'detail.code:',
            err?.detail?.code,
            'detail.message:',
            err?.detail?.message,
        )
        throw err
    }
    return { url: session.url!, sessionId: session.id }
}

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
        metadata: {
            type: 'add_member',
            registrationId: params.registrationId,
            memberName: params.name,
            memberTierId: params.memberTierId,
            memberBirthDate: params.memberBirthDate ?? '',
            memberShirtSize: params.memberShirtSize ?? '',
            memberPriceCents: String(params.priceCents),
        },
    })
    return session.url!
}

export async function refundPaymentIntent(
    paymentIntentId: string,
    amountCents?: number,
): Promise<void> {
    await getStripe().refunds.create({
        payment_intent: paymentIntentId,
        ...(amountCents !== undefined ? { amount: amountCents } : {}),
    })
}

export async function retrieveSessionPaymentIntent(sessionId: string): Promise<string | null> {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    return typeof session.payment_intent === 'string' ? session.payment_intent : null
}
