import { fail, isHttpError, redirect } from '@sveltejs/kit'
import { quoteAmountDue } from '$lib/general/pricing'
import {
    VIEW_TOKEN_COOKIE,
    createMemberPayment,
    getAmountDueByToken,
    rememberViewToken,
} from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import type { Actions, PageServerLoad } from './$types'
import { AMOUNT_DUE_DEPENDENCY } from './AMOUNT_DUE_DEPENDENCY'

/* Stripe's success URL. Its presence tells the page the payer has just come back from paying, so a
   place still marked owed means the webhook has not landed yet rather than that nothing happened. */
const CONFIRMING_PARAM = 'confirming'

/* Pays by card for the people an organizer added to a paid booking — the one thing a registrant can
   do with their view link that moves money, and it only moves it in. Reached from the button on
   /register/view, which stays read-only, and from the payment email.

   The email links here with ?token=, which is moved into the cookie and stripped from the address
   bar before anything renders, exactly as /register/view does. Everything after that reads the
   cookie. */
export const load: PageServerLoad = async ({ cookies, url, depends }) => {
    rememberViewToken(url, cookies)
    depends(AMOUNT_DUE_DEPENDENCY)

    const token = cookies.get(VIEW_TOKEN_COOKIE)
    const owed = token ? await getAmountDueByToken(token) : undefined

    return {
        hasRegistration: owed !== undefined,
        confirming: url.searchParams.has(CONFIRMING_PARAM),
        /* Names, tiers and prices only — the quote carries nothing else, which matters for the page
           data of a forwardable link. Not the registration: it holds the contact and the token hash. */
        quote: owed?.quote ?? quoteAmountDue([]),
    }
}

export const actions: Actions = {
    default: async ({ cookies, url }) => {
        const token = cookies.get(VIEW_TOKEN_COOKIE)
        if (!token) {
            return fail(401, { error: 'Open the link in your registration email, then try again.' })
        }

        let checkoutUrl: string
        try {
            const payment = await createMemberPayment({
                viewToken: token,
                successUrl: `${url.origin}/register/pay?${CONFIRMING_PARAM}`,
                cancelUrl: `${url.origin}/register/pay`,
            })
            checkoutUrl = payment.checkoutUrl
        } catch (err) {
            /* A refusal — nothing owed any more, a stale link — says why. Anything else is Stripe or
               the database, which the payer cannot fix and Sentry needs to hear about. */
            if (isHttpError(err)) {
                return fail(err.status, { error: err.body.message })
            }
            reportError('member payment checkout failed', err)
            return fail(502, {
                error: 'We could not open the payment page. Please try again in a minute.',
            })
        }

        throw redirect(303, checkoutUrl)
    },
}
