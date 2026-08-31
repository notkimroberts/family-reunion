<script lang="ts">
import { CalendarDays, MapPin, Sparkles } from '@lucide/svelte'
import * as Sentry from '@sentry/sveltekit'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { RegistrationDeadline } from '$lib/components'
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { quotePartyTotal } from '$lib/general/pricing'
import { isRegistrationClosed } from '$lib/general/registration'
import { defaultAdultTierId } from '$lib/general/tiers'
import { formatDateRange, formatPrice, getTierPriceCents, isValidPhone, toE164 } from '$lib/utils'
import DonationCard from './DonationCard.svelte'
import { EMPTY_PERSON_DETAILS } from './EMPTY_PERSON_DETAILS'
import FormErrorSummary from './FormErrorSummary.svelte'
import HostHotelStayCard from './HostHotelStayCard.svelte'
import OrderSummaryCard from './OrderSummaryCard.svelte'
import PartyMembersBuilder from './PartyMembersBuilder.svelte'
import YourInformationCard from './YourInformationCard.svelte'
import { isContactComplete } from './isContactComplete'
import { registrationSchema } from './schema'
import type { FormMember, PersonDetails } from './types'

let { data } = $props()

/* superforms' $form is a STORE, not $state — so $form.self is a plain object and binding to its
   nested properties is untrackable ("binding_property_non_reactive"). The editing surface therefore
   has to be $state; superforms offers only store-based fieldProxy for nested paths, and one proxy
   per field would mean ten props on a card designed to take one.

   So: $state for editing, and exactly ONE sync into $form, in onSubmit. That keeps both bugs
   fixed. $form is complete before validation runs (superForm.js runs onSubmit handlers at :1206,
   client validation at :1229), so validators are meaningful; and dataType 'json' posts $form, so
   no hidden inputs mirror state into the DOM.

   The contact's own scalar fields bind straight to $form — top-level `$form.x = v` compiles to a
   store update, which is reactive. Only nested mutation is not. */
const { form, errors, message, submitting, enhance } = superForm(data.form, {
    validators: zodClient(registrationSchema),
    dataType: 'json',
    /* Superforms swallows a failed submit into $errors and, for a transport/server error, into
       onError. Neither was surfaced, so every failure looked like an inert button. FormErrorSummary
       shows the validation half; this reports the rest. */
    onError: ({ result }) => {
        Sentry.captureException(
            new Error(`public registration submit failed: ${result.error?.message ?? 'unknown'}`),
            { tags: { source: 'superforms-onError' }, extra: { status: result.status } },
        )
    },
    onSubmit: () => {
        $form.self = { ...self }
        $form.members = members.map((member) => ({ ...member }))
        $form.donationCents = donationCents
    },
})

const tiers = data.tiers

let self = $state<PersonDetails>({
    ...EMPTY_PERSON_DETAILS,
    tierId: defaultAdultTierId(data.tiers),
})
let members = $state<FormMember[]>([])
/* Cents, and $state for the same reason `self` is: the picker binds it, and one sync into $form
   happens in onSubmit. */
let donationCents = $state(0)
/* Mirrors YourInformationCard's internal Save state — the registrant must commit their own
   details before paying. UI state, so it stays out of $form. */
let contactSaved = $state(false)

let contactName = $derived(
    `${$form.contactFirstName.trim()} ${$form.contactLastName.trim()}`.trim(),
)
let contactAddress = $derived({
    addressLine1: self.addressLine1,
    addressLine2: self.addressLine2,
    addressCity: self.addressCity,
    addressState: self.addressState,
    addressZip: self.addressZip,
})

/* One quote for the whole party, from the same module the server builds its Stripe line items
   against — so what the payer is shown and what the card is charged cannot disagree. */
let quote = $derived(
    quotePartyTotal(
        [
            ...(self.tierId ? [getTierPriceCents(self.tierId, tiers)] : []),
            ...members.map((m) => getTierPriceCents(m.tierId, tiers)),
        ],
        { donationCents },
    ),
)

let canSubmit = $derived(
    contactSaved &&
        isContactComplete({
            firstName: $form.contactFirstName,
            lastName: $form.contactLastName,
            email: $form.contactEmail,
            details: self,
        }) &&
        /* Phone is optional here, so only its validity matters. */
        (!$form.contactPhone.trim() || isValidPhone($form.contactPhone)),
)

let dateRange = $derived(
    data.event?.startDate
        ? formatDateRange(
              new Date(data.event.startDate),
              data.event.endDate ? new Date(data.event.endDate) : new Date(data.event.startDate),
          )
        : '',
)

/* Same predicate the server applies in createPendingRegistration. Without it the form renders,
   accepts a full party, and only fails with a 403 at submit — after the registrant has done all the
   work. */
let isLocked = $derived(isRegistrationClosed(data.event?.registrationLockDate ?? null))
</script>

<svelte:head>
    <title>Register — {APP_NAME}</title>
</svelte:head>

{#if !data.event}
    <div class="col-span-12">
        <div class="bg-card rounded-xl border px-6 py-12 text-center">
            <p class="mb-3 text-4xl">😢</p>
            <p class="text-lg font-semibold">No reunion events are open right now.</p>
            <p class="text-muted-foreground mt-1 text-sm">Check back soon!</p>
        </div>
    </div>
{:else}
    <!-- Event hero banner -->
    <section class="col-span-12">
        <div class="bg-card rounded-xl border shadow-xs">
            <div class="flex flex-col items-center px-6 py-10 text-center md:px-10 md:py-14">
                <span
                    class="bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase">
                    <Sparkles class="text-primary h-3 w-3" />
                    Family Reunion {data.event.year}
                </span>

                <h1 class="mt-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                    {data.event.title}
                </h1>

                <div class="bg-primary/40 mt-4 h-px w-12"></div>

                <div
                    class="text-muted-foreground mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                    {#if dateRange}
                        <span class="inline-flex items-center gap-1.5">
                            <CalendarDays class="text-primary/70 h-4 w-4" />
                            {dateRange}
                        </span>
                    {/if}
                    {#if data.event.metadata.venue?.name}
                        <span class="bg-border hidden h-1 w-1 rounded-full md:inline-block"></span>
                        <span class="inline-flex items-center gap-1.5">
                            <MapPin class="text-primary/70 h-4 w-4" />
                            {data.event.metadata.venue.name}
                        </span>
                    {/if}
                </div>

                <RegistrationDeadline lockDate={data.event.registrationLockDate} class="mt-5" />
            </div>
        </div>
    </section>

    {#if isLocked}
        <section class="col-span-12">
            <div class="bg-card rounded-xl border px-6 py-12 text-center">
                <p class="text-lg font-semibold">Registration for this reunion has closed.</p>
                <p class="text-muted-foreground mt-1 text-sm">
                    If you have already registered, you can still
                    <a class="underline" href="/register/recover">view your registration</a>.
                </p>
                <p class="text-muted-foreground mt-3 text-sm">
                    Need to register late? Contact
                    <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
                    or call
                    <a class="underline" href="sms:{toE164(CONTACT_PHONE)}">{CONTACT_PHONE}</a>.
                </p>
            </div>
        </section>
    {:else}
        <form method="POST" action="?/register" use:enhance class="col-span-12">
            <div class="mb-4">
                <FormErrorSummary errors={$errors} message={$message} />
            </div>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
                <!-- Left: party builder -->
                <div class="flex flex-col gap-4">
                    <YourInformationCard
                        bind:email={$form.contactEmail}
                        bind:phone={$form.contactPhone}
                        bind:firstName={$form.contactFirstName}
                        bind:lastName={$form.contactLastName}
                        bind:info={self}
                        bind:saved={contactSaved}
                        {tiers}
                        errors={{
                            email: $errors.contactEmail?.[0],
                            name: $errors.contactFirstName?.[0] ?? $errors.contactLastName?.[0],
                        }} />

                    <PartyMembersBuilder
                        bind:members
                        {tiers}
                        {contactName}
                        {contactAddress}
                        error={$errors.members?._errors?.[0]} />

                    <HostHotelStayCard
                        bind:stayingAtHostHotel={$form.stayingAtHostHotel}
                        error={$errors.stayingAtHostHotel?.[0]} />

                    <DonationCard bind:donationCents error={$errors.donationCents?.[0]} />
                </div>

                <!-- Right: order summary (sticky on desktop) -->
                <div class="self-start lg:sticky lg:top-6">
                    <OrderSummaryCard
                        {contactName}
                        selfTierId={self.tierId}
                        {members}
                        {tiers}
                        {quote}
                        {canSubmit}
                        submitLabel={`Pay $${formatPrice(quote.totalCents)} & Register`}
                        submitting={$submitting}
                        placeholderText="Fill in your details above and press Save to continue."
                        submitFootnote="You'll be redirected to a secure checkout." />
                    <p class="text-muted-foreground mt-3 text-center text-xs">
                        Already registered? <a class="underline" href="/register/recover"
                            >Resend management link</a>
                    </p>
                    <p class="text-muted-foreground mt-1 text-center text-xs">
                        Prefer paper? <a class="underline" href="/register/print"
                            >Print a registration form</a>
                    </p>
                </div>
            </div>
        </form>
    {/if}
{/if}
