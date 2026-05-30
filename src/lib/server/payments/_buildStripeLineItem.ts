export type LineItemInput = {
    name: string
    priceCents: number
}

export function buildStripeLineItem(item: LineItemInput) {
    return {
        price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: item.priceCents,
        },
        quantity: 1,
    }
}
