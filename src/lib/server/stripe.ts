import Stripe from 'stripe'
import { env } from '$env/dynamic/private'

export function getStripe() {
    return new Stripe(env.STRIPE_SECRET_KEY!, {
        httpClient: Stripe.createFetchHttpClient(),
    })
}
