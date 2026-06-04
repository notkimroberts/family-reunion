// Name and price data needed to construct a Stripe line item
export type LineItemInput = {
    name: string
    priceCents: number
}

// Converts a LineItemInput into a Stripe-compatible price_data line item object
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
