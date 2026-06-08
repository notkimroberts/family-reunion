<script lang="ts">
import { SvelteMap } from 'svelte/reactivity'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { APP_NAME } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
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

const tiers = data.tiers
const tierMap = new SvelteMap(tiers.map((t) => [t.id, t]))

let selfTierId = $state('')
let selfBirthDate = $state<string | undefined>(undefined)
let selfShirtSize = $state('')

/* Split the initial contactName (server-prefilled if user is logged in) into first/last
   on first space. The two visible inputs are the source of truth; we send a derived
   "First Last" through a hidden input named contactName, so the schema/server stay
   identical to before. */
const initialName = $form.contactName.trim()
const initialFirstSpace = initialName.indexOf(' ')
let selfFirstName = $state(
    initialFirstSpace === -1 ? initialName : initialName.slice(0, initialFirstSpace),
)
let selfLastName = $state(
    initialFirstSpace === -1 ? '' : initialName.slice(initialFirstSpace + 1).trim(),
)
let contactName = $derived(`${selfFirstName.trim()} ${selfLastName.trim()}`.trim())

$effect(() => {
    $form.selfTierId = selfTierId
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

let selfTier = $derived(selfTierId ? tierMap.get(selfTierId) : undefined)
/* Subtotal in net cents (sum of selected tier prices). */
let subtotal = $derived(
    (selfTier?.priceCents ?? 0) +
        members.reduce((sum, m) => sum + (tierMap.get(m.tierId)?.priceCents ?? 0), 0),
)
/* Fee is the sum of per-member gross-ups so it never disagrees with what Stripe will
   actually charge (server uses the same per-member gross-up). */
let processingFee = $derived(
    stripeFeeCents(selfTier?.priceCents ?? 0) +
        members.reduce((sum, m) => sum + stripeFeeCents(tierMap.get(m.tierId)?.priceCents ?? 0), 0),
)
let total = $derived(subtotal + processingFee)
let canSubmit = $derived(
    !!selfFirstName.trim() &&
        !!selfLastName.trim() &&
        !!$form.contactEmail.trim() &&
        !!selfTierId &&
        !!selfBirthDate,
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
        <div class="rounded-xl border bg-card px-6 py-8 text-center">
            <h1 class="text-2xl">{data.event.title}</h1>
            {#if data.event.startDate}
                <p class="text-sm text-muted-foreground mt-1">
                    {new Date(data.event.startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                    {#if data.event.endDate}
                        –
                        {new Date(data.event.endDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    {/if}
                </p>
            {/if}
        </div>
    </section>

    <form method="POST" action="?/register" use:enhance class="col-span-12">
        <input type="hidden" name="eventId" bind:value={$form.eventId} />
        <input type="hidden" name="contactName" value={contactName} />
        <input type="hidden" name="selfTierId" bind:value={$form.selfTierId} />
        <input type="hidden" name="selfBirthDate" bind:value={$form.selfBirthDate} />
        <input type="hidden" name="selfShirtSize" bind:value={$form.selfShirtSize} />
        <input type="hidden" name="members" bind:value={$form.members} />

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
            <!-- Left: party builder -->
            <div class="flex flex-col gap-4">
                <YourInformationCard
                    bind:email={$form.contactEmail}
                    bind:firstName={selfFirstName}
                    bind:lastName={selfLastName}
                    bind:birthDate={selfBirthDate}
                    bind:shirtSize={selfShirtSize}
                    bind:tierId={selfTierId}
                    {tiers}
                    shirtsEnabled={data.event.shirtsEnabled}
                    errors={{
                        email: $errors.contactEmail?.[0],
                        name: $errors.contactName?.[0],
                    }} />

                <PartyMembersBuilder
                    bind:members
                    {tiers}
                    shirtsEnabled={data.event.shirtsEnabled}
                    error={$errors.members?.[0]} />
            </div>

            <!-- Right: order summary (sticky on desktop) -->
            <div class="self-start lg:sticky lg:top-6">
                <OrderSummaryCard
                    {contactName}
                    {selfTier}
                    {members}
                    {tierMap}
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
