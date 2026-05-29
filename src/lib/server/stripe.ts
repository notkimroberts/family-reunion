import Stripe from 'stripe'
import { env } from '$env/dynamic/private'

let _stripe: Stripe | undefined

export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
            httpClient: Stripe.createFetchHttpClient(),
        })
    }
    return _stripe
}
