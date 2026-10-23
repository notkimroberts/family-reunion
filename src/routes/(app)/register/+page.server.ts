import { fail, redirect } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { defaults, superValidate } from 'sveltekit-superforms/server'
import { env } from '$env/dynamic/private'
import { HOST_HOTEL } from '$lib/general/constants'
import { isBeforeRegistrationOpens } from '$lib/general/registration'
import { dbg } from '$lib/server/debug'
import {
    REGISTRATION_PREVIEW_COOKIE,
    REGISTRATION_PREVIEW_PARAM,
    createPendingRegistration,
    getOpenEvent,
    hasRegistrationPreview,
    isRegistrationPreviewKey,
} from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import { splitFullName } from '$lib/utils'
import type { Actions, PageServerLoad } from './$types'
import { EMPTY_PERSON_DETAILS } from './EMPTY_PERSON_DETAILS'
import { registrationSchema } from './schema'
import { toRegistrationIntake } from './toRegistrationIntake'

/* Long enough for a round of testing; deleting REGISTRATION_PREVIEW_KEY ends it sooner. */
const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 14 // 14 days

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
    /* The preview link: a correct key is moved into a cookie, and the key leaves the address bar
       either way, so it is not kept in history, logs or referrers — as /register/view does with its
       token. A wrong key just lands on the ordinary page. */
    const previewKey = url.searchParams.get(REGISTRATION_PREVIEW_PARAM)
    if (previewKey !== null) {
        if (isRegistrationPreviewKey(previewKey, env.REGISTRATION_PREVIEW_KEY)) {
            cookies.set(REGISTRATION_PREVIEW_COOKIE, previewKey, {
                path: '/register',
                httpOnly: true,
                sameSite: 'lax',
                secure: !url.hostname.includes('localhost'),
                maxAge: PREVIEW_COOKIE_MAX_AGE,
            })
        }
        const cleanUrl = new URL(url)
        cleanUrl.searchParams.delete(REGISTRATION_PREVIEW_PARAM)
        throw redirect(303, cleanUrl.toString())
    }

    const openEvent = await getOpenEvent()
    const tiers = openEvent ? await getTiersForEvent(openEvent.id) : []

    /* Prefill from the signed-in user where possible. Anonymous visitors — the normal case, since
       registration is public — get blanks. */
    const { firstName, lastName } = splitFullName(locals.user?.name ?? '')

    /* defaults() rather than superValidate() so a cold load renders with no errors. superValidate
       would run the schema against these blanks and ship the resulting min(1) errors to the
       client, where they flash on hydration. The action below still validates normally.

       Every field is seeded, including the nested self object and the members array, so $form is
       complete from the first render — client validation and the JSON post both read it directly. */
    const form = defaults(
        {
            eventId: openEvent?.id ?? '',
            contactFirstName: firstName,
            contactLastName: lastName,
            contactEmail: locals.user?.email ?? '',
            contactPhone: '',
            self: { ...EMPTY_PERSON_DETAILS },
            members: [],
            /* 'undecided' when there is no host hotel to ask about, since the card renders nothing
               and the answer is still required. Otherwise blank, so nothing is pre-chosen. */
            stayingAtHostHotel: HOST_HOTEL ? ('' as const) : ('undecided' as const),
            donationCents: 0,
        },
        zod(registrationSchema),
    )

    /* Set only while it changes something: before the opening date, for a browser holding the
       current key. stripeTestMode decides the banner — the test card, or a warning that a real card
       is charged. Same test as the admin registrations page. */
    const preview =
        openEvent &&
        isBeforeRegistrationOpens(openEvent.registrationOpensAt) &&
        hasRegistrationPreview(cookies)
            ? { stripeTestMode: env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? true }
            : null

    return {
        event: openEvent,
        tiers,
        form,
        preview,
    }
}

export const actions: Actions = {
    register: async (event) => {
        const form = await superValidate(event.request, zod(registrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const intake = toRegistrationIntake(form.data)

        dbg.register(
            'email=%s eventId=%s members=%d',
            intake.contactEmail,
            form.data.eventId,
            intake.members.length,
        )

        const { checkoutUrl } = await createPendingRegistration({
            ...intake,
            eventId: form.data.eventId,
            donationCents: form.data.donationCents,
            successUrl: (token) => `${event.url.origin}/register/view?token=${token}`,
            /* No token: nothing on /register reads it, and in the address bar it is a credential to
               the pending booking, kept by browser history and sent in referrers. */
            cancelUrl: () => `${event.url.origin}/register?cancelled=true`,
            allowBeforeOpening: hasRegistrationPreview(event.cookies),
        })

        throw redirect(303, checkoutUrl)
    },
}
