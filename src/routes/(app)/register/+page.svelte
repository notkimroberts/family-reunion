<script lang="ts">
import { CalendarDays, MapPin, Sparkles } from '@lucide/svelte'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatDateRange, formatPrice, getTierPriceCents, isValidPhone } from '$lib/utils'
import { stripeFeeCents } from '$lib/utils/stripeFee'
import OrderSummaryCard from './OrderSummaryCard.svelte'
import PartyMembersBuilder from './PartyMembersBuilder.svelte'
import YourInformationCard from './YourInformationCard.svelte'
import { isContactComplete } from './isContactComplete'
import { registrationSchema } from './schema'

let { data } = $props()

/* $form is the single source of truth. Every field the schema declares lives in it — including
   the nested `self` object and the `members` array — and dataType 'json' posts it verbatim, so
   there are no hidden inputs mirroring state into the DOM.

   That is what makes `validators` safe to use. Superforms validates the $form store on submit
   (superForm.js: `dataToValidate = opts.formData ?? Data.form`) and cancels when it fails; while
   fields lived outside $form, client validation could never pass and every submit was silently
   cancelled. Now the store is complete, so validation is meaningful and errors surface per field
   before a request is made. */
const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(registrationSchema),
    dataType: 'json',
})

const tiers = data.tiers

/* Mirrors YourInformationCard's internal Save state — the registrant must commit their own
   details before paying. UI state, so it stays out of $form. */
let contactSaved = $state(false)

let contactName = $derived(
    `${$form.contactFirstName.trim()} ${$form.contactLastName.trim()}`.trim(),
)
let contactAddress = $derived({
    addressLine1: $form.self.addressLine1,
    addressLine2: $form.self.addressLine2,
    addressCity: $form.self.addressCity,
    addressState: $form.self.addressState,
    addressZip: $form.self.addressZip,
})

/* Subtotal in net cents (sum of selected tier prices). */
let subtotal = $derived(
    ($form.self.tierId ? getTierPriceCents($form.self.tierId, tiers) : 0) +
        $form.members.reduce((sum, m) => sum + getTierPriceCents(m.tierId, tiers), 0),
)
/* Fee is the sum of per-member gross-ups so it never disagrees with what Stripe will actually
   charge (the server uses the same per-member gross-up). */
let processingFee = $derived(
    ($form.self.tierId ? stripeFeeCents(getTierPriceCents($form.self.tierId, tiers)) : 0) +
        $form.members.reduce(
            (sum, m) => sum + stripeFeeCents(getTierPriceCents(m.tierId, tiers)),
            0,
        ),
)
let total = $derived(subtotal + processingFee)

let canSubmit = $derived(
    contactSaved &&
        isContactComplete({
            firstName: $form.contactFirstName,
            lastName: $form.contactLastName,
            email: $form.contactEmail,
            details: $form.self,
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

/* Same check the server applies in createPendingRegistration. Without it the form renders,
   accepts a full party, and only fails with a 403 at submit — after the registrant has done
   all the work. Mirrors RegistrationManager's isLocked. */
let isLocked = $derived(
    !!data.event?.registrationLockDate && new Date(data.event.registrationLockDate) < new Date(),
)
</script>

<svelte:head>
    <title>Register — {APP_NAME}</title>
</svelte:head>

{#if !data.event}
    <div class="col-span-12">
        <div class="rounded-xl border bg-card px-6 py-12 text-center">
            <p class="text-4xl mb-3">😢</p>
            <p class="text-lg font-semibold">No reunion events are open right now.</p>
            <p class="text-muted-foreground text-sm mt-1">Check back soon!</p>
        </div>
    </div>
{:else}
    <!-- Event hero banner -->
    <section class="col-span-12">
        <div class="rounded-xl border bg-card shadow-xs">
            <div class="flex flex-col items-center px-6 py-10 text-center md:px-10 md:py-14">
                <span
                    class="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <Sparkles class="h-3 w-3 text-primary" />
                    Family Reunion {data.event.year}
                </span>

                <h1 class="mt-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                    {data.event.title}
                </h1>

                <div class="mt-4 h-px w-12 bg-primary/40"></div>

                <div
                    class="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    {#if dateRange}
                        <span class="inline-flex items-center gap-1.5">
                            <CalendarDays class="h-4 w-4 text-primary/70" />
                            {dateRange}
                        </span>
                    {/if}
                    {#if data.event.venue?.name}
                        <span class="hidden h-1 w-1 rounded-full bg-border md:inline-block"></span>
                        <span class="inline-flex items-center gap-1.5">
                            <MapPin class="h-4 w-4 text-primary/70" />
                            {data.event.venue.name}
                        </span>
                    {/if}
                </div>
            </div>
        </div>
    </section>

    {#if isLocked}
        <section class="col-span-12">
            <div class="rounded-xl border bg-card px-6 py-12 text-center">
                <p class="text-lg font-semibold">Registration for this reunion has closed.</p>
                <p class="text-muted-foreground text-sm mt-1">
                    If you have already registered, you can still
                    <a class="underline" href="/register/recover">manage your registration</a>.
                </p>
                <p class="text-muted-foreground text-sm mt-3">
                    Need to register late? Contact
                    <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
                    or call <a class="underline" href="sms:{CONTACT_PHONE}">{CONTACT_PHONE}</a>.
                </p>
            </div>
        </section>
    {:else}
        <form method="POST" action="?/register" use:enhance class="col-span-12">
            <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
                <!-- Left: party builder -->
                <div class="flex flex-col gap-4">
                    <YourInformationCard
                        bind:email={$form.contactEmail}
                        bind:phone={$form.contactPhone}
                        bind:firstName={$form.contactFirstName}
                        bind:lastName={$form.contactLastName}
                        bind:info={$form.self}
                        bind:saved={contactSaved}
                        {tiers}
                        shirtsEnabled={data.event.shirtsEnabled}
                        errors={{
                            email: $errors.contactEmail?.[0],
                            name: $errors.contactFirstName?.[0] ?? $errors.contactLastName?.[0],
                        }} />

                    <PartyMembersBuilder
                        bind:members={$form.members}
                        {tiers}
                        {contactName}
                        {contactAddress}
                        shirtsEnabled={data.event.shirtsEnabled}
                        error={$errors.members?._errors?.[0]} />
                </div>

                <!-- Right: order summary (sticky on desktop) -->
                <div class="self-start lg:sticky lg:top-6">
                    <OrderSummaryCard
                        {contactName}
                        selfTierId={$form.self.tierId}
                        members={$form.members}
                        {tiers}
                        {subtotal}
                        {processingFee}
                        {canSubmit}
                        submitLabel={`Pay $${formatPrice(total)} & Register`}
                        placeholderText="Fill in your details above and press Save to continue."
                        submitFootnote="You'll be redirected to a secure checkout." />
                    <p class="text-xs text-muted-foreground text-center mt-3">
                        Already registered? <a class="underline" href="/register/recover"
                            >Resend management link</a>
                    </p>
                </div>
            </div>
        </form>
    {/if}
{/if}
