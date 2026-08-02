<script lang="ts">
import { CalendarDays, MapPin, Sparkles } from '@lucide/svelte'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { APP_NAME } from '$lib/general/constants'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import {
    formatDateRange,
    formatPrice,
    getCategoryPriceCents,
    isValidPhone,
    splitFullName,
} from '$lib/utils'
import { stripeFeeCents } from '$lib/utils/stripeFee'
import OrderSummaryCard from './OrderSummaryCard.svelte'
import PartyMembersBuilder from './PartyMembersBuilder.svelte'
import YourInformationCard from './YourInformationCard.svelte'
import { registrationSchema } from './schema'
import type { FormMember } from './types'

let { data } = $props()

const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(registrationSchema),
    dataType: 'form',
})

const adultPriceCents = data.event?.adultPriceCents ?? 0
const childPriceCents = data.event?.childPriceCents ?? 0

let selfCategory = $state<RegistrationCategory | ''>('')
let selfBirthDate = $state<string | undefined>(undefined)
let selfShirtSize = $state('')

/* Split the initial contactName (server-prefilled if user is logged in) into first/last.
   The two visible inputs are the source of truth; we send a derived "First Last" through
   a hidden input named contactName, so the schema/server stay identical to before. */
const initialSplit = splitFullName($form.contactName)
let selfFirstName = $state(initialSplit.firstName)
let selfLastName = $state(initialSplit.lastName)
let contactName = $derived(`${selfFirstName.trim()} ${selfLastName.trim()}`.trim())

$effect(() => {
    $form.selfCategory = selfCategory as 'adult' | 'child'
})
$effect(() => {
    $form.selfBirthDate = selfBirthDate ?? ''
})
$effect(() => {
    $form.selfShirtSize = selfShirtSize
})

let members = $state<FormMember[]>([])

$effect(() => {
    $form.members = JSON.stringify(members)
})

function categoryPriceCents(category: RegistrationCategory): number {
    return getCategoryPriceCents(category, { adultPriceCents, childPriceCents })
}

/* Subtotal in net cents (sum of selected category prices). */
let subtotal = $derived(
    (selfCategory ? categoryPriceCents(selfCategory) : 0) +
        members.reduce((sum, m) => sum + categoryPriceCents(m.category), 0),
)
/* Fee is the sum of per-member gross-ups so it never disagrees with what Stripe will
   actually charge (server uses the same per-member gross-up). */
let processingFee = $derived(
    (selfCategory ? stripeFeeCents(categoryPriceCents(selfCategory)) : 0) +
        members.reduce((sum, m) => sum + stripeFeeCents(categoryPriceCents(m.category)), 0),
)
let total = $derived(subtotal + processingFee)
let canSubmit = $derived(
    !!selfFirstName.trim() &&
        !!selfLastName.trim() &&
        !!$form.contactEmail.trim() &&
        !!selfCategory &&
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

    <form method="POST" action="?/register" use:enhance class="col-span-12">
        <input type="hidden" name="eventId" bind:value={$form.eventId} />
        <input type="hidden" name="contactName" value={contactName} />
        <input type="hidden" name="selfCategory" bind:value={$form.selfCategory} />
        <input type="hidden" name="selfBirthDate" bind:value={$form.selfBirthDate} />
        <input type="hidden" name="selfShirtSize" bind:value={$form.selfShirtSize} />
        <input type="hidden" name="members" bind:value={$form.members} />

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
            <!-- Left: party builder -->
            <div class="flex flex-col gap-4">
                <YourInformationCard
                    bind:email={$form.contactEmail}
                    bind:phone={$form.contactPhone}
                    bind:firstName={selfFirstName}
                    bind:lastName={selfLastName}
                    bind:birthDate={selfBirthDate}
                    bind:shirtSize={selfShirtSize}
                    bind:category={selfCategory}
                    {adultPriceCents}
                    {childPriceCents}
                    shirtsEnabled={data.event.shirtsEnabled}
                    errors={{
                        email: $errors.contactEmail?.[0],
                        name: $errors.contactName?.[0],
                    }} />

                <PartyMembersBuilder
                    bind:members
                    {adultPriceCents}
                    {childPriceCents}
                    shirtsEnabled={data.event.shirtsEnabled}
                    error={$errors.members?.[0]} />
            </div>

            <!-- Right: order summary (sticky on desktop) -->
            <div class="self-start lg:sticky lg:top-6">
                <OrderSummaryCard
                    {contactName}
                    {selfCategory}
                    {members}
                    {adultPriceCents}
                    {childPriceCents}
                    {subtotal}
                    {processingFee}
                    {canSubmit}
                    submitLabel={`Pay $${formatPrice(total)} & Register`}
                    placeholderText="Enter your name, email, and birthday above to get started."
                    submitFootnote="You'll be redirected to a secure checkout." />
                <p class="text-xs text-muted-foreground text-center mt-3">
                    Already registered? <a class="underline" href="/register/recover"
                        >Resend management link</a>
                </p>
            </div>
        </div>
    </form>
{/if}
