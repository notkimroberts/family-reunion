import { fail, redirect } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { defaults, superValidate } from 'sveltekit-superforms/server'
import { dbg } from '$lib/server/debug'
import { createPendingDonation, getPublicDonationTotal } from '$lib/server/donations'
import { getOpenEvent } from '$lib/server/registrations'
import type { Actions, PageServerLoad } from './$types'
import { donationSchema } from './schema'

/* Fallback when no reunion is open. A gift can still be given and still be recorded — see
   createPendingDonation — so the page must have something to call the line item. */
const UNATTACHED_LINE_ITEM_NAME = 'Gift to the family reunion'

export const load: PageServerLoad = async ({ locals, url }) => {
    const openEvent = await getOpenEvent()
    const raised = openEvent
        ? await getPublicDonationTotal(openEvent.id)
        : { totalCents: 0, giftCount: 0 }

    /* ?amount= lets the home page's preset buttons carry the figure across, so a visitor who has
       already chosen $50 does not choose it again. Anything unparseable is simply ignored; the
       schema is what decides whether a number is acceptable. */
    const requested = Number.parseInt(url.searchParams.get('amount') ?? '', 10)

    const form = defaults(
        {
            donorName: locals.user?.name ?? '',
            donorEmail: locals.user?.email ?? '',
            amountCents: Number.isFinite(requested) && requested > 0 ? requested : 0,
            message: '',
        },
        zod(donationSchema),
    )

    return { event: openEvent, raised, form }
}

export const actions: Actions = {
    /* No lock-date check, deliberately: donations outlive registration. See createPendingDonation. */
    donate: async (event) => {
        const form = await superValidate(event.request, zod(donationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const openEvent = await getOpenEvent()

        dbg.register(
            'donation intake email=%s amount=%d',
            form.data.donorEmail,
            form.data.amountCents,
        )

        const { checkoutUrl } = await createPendingDonation({
            donorName: form.data.donorName.trim(),
            /* Lowercased for the same reason the registration email is: it is the key anything
               later matches this donor on. */
            donorEmail: form.data.donorEmail.trim().toLowerCase(),
            amountCents: form.data.amountCents,
            message: form.data.message?.trim() || undefined,
            eventId: openEvent?.id,
            lineItemName: openEvent ? `Gift to ${openEvent.title}` : UNATTACHED_LINE_ITEM_NAME,
            successUrl: () => `${event.url.origin}/donate/thanks`,
            cancelUrl: () => `${event.url.origin}/donate?cancelled=true`,
        })

        throw redirect(303, checkoutUrl)
    },
}
