<script lang="ts">
import { Plus, Trash2, UserCircle } from '@lucide/svelte'
import { Select as BitsSelect } from 'bits-ui'
import { SvelteMap } from 'svelte/reactivity'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { DatePicker } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { Separator } from '$lib/components/ui/separator'
import { APP_NAME, SHIRT_SIZES } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import { parseBirthDate } from '$lib/utils/age'
import { stripeFeeCents } from '$lib/utils/stripeFee'
import { getDefaultTierId, getTierLabel, getTierPrice, getMemberAge } from './pricingUtils'
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

/* Auto-select tier from birthday */
$effect(() => {
    if (selfBirthDate) {
        const parsed = parseBirthDate(selfBirthDate)
        if (parsed) {
            const suggested = getDefaultTierId(tiers, parsed.birthYear)
            if (suggested) {
                selfTierId = suggested
            }
        }
    }
})

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
let showAddForm = $state(false)
let newFirstName = $state('')
let newLastName = $state('')
let newTierId = $state('')
let newBirthDate = $state<string | undefined>(undefined)
let newShirtSize = $state('')

/* Auto-select tier from new member birthday */
$effect(() => {
    if (newBirthDate) {
        const parsed = parseBirthDate(newBirthDate)
        if (parsed) {
            const suggested = getDefaultTierId(tiers, parsed.birthYear)
            if (suggested) {
                newTierId = suggested
            }
        }
    }
})

$effect(() => {
    $form.members = JSON.stringify(members)
})

function handleAddMember() {
    if (!newFirstName.trim() || !newLastName.trim() || !newTierId || !newBirthDate) {
        return
    }
    members = [
        ...members,
        {
            name: `${newFirstName.trim()} ${newLastName.trim()}`,
            tierId: newTierId,
            birthDate: newBirthDate,
            shirtSize: newShirtSize || undefined,
        },
    ]
    newFirstName = ''
    newLastName = ''
    newTierId = ''
    newBirthDate = undefined
    newShirtSize = ''
    showAddForm = false
}

function handleCancelAdd() {
    showAddForm = false
    newFirstName = ''
    newLastName = ''
    newTierId = ''
    newBirthDate = undefined
    newShirtSize = ''
}

function handleRemoveMember(index: number) {
    members = members.filter((_, i) => i !== index)
}

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
            <p class="text-4xl mb-3">🎉</p>
            <h1>{data.event.title}</h1>
            <p class="text-muted-foreground mt-1">{data.event.year} Reunion</p>
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
            <p class="mt-3 text-sm text-muted-foreground">
                Add everyone in your party below — no account required.
            </p>
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
                <!-- Your info card -->
                <Card>
                    <CardHeader class="pb-3">
                        <CardTitle class="flex items-center gap-2 text-base">
                            <UserCircle class="h-5 w-5 text-muted-foreground" />
                            Your Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div class="space-y-1.5">
                                <label for="contactFirstName" class="text-sm font-medium">
                                    First name <span class="text-destructive">*</span>
                                </label>
                                <Input
                                    id="contactFirstName"
                                    type="text"
                                    bind:value={selfFirstName}
                                    placeholder="First"
                                    autocomplete="given-name"
                                    required />
                            </div>
                            <div class="space-y-1.5">
                                <label for="contactLastName" class="text-sm font-medium">
                                    Last name <span class="text-destructive">*</span>
                                </label>
                                <Input
                                    id="contactLastName"
                                    type="text"
                                    bind:value={selfLastName}
                                    placeholder="Last"
                                    autocomplete="family-name"
                                    required />
                                {#if $errors.contactName?.[0]}
                                    <p class="text-sm text-destructive">
                                        {$errors.contactName[0]}
                                    </p>
                                {/if}
                            </div>
                            <div class="space-y-1.5">
                                <label for="contactEmail" class="text-sm font-medium">
                                    Email <span class="text-destructive">*</span>
                                </label>
                                <Input
                                    id="contactEmail"
                                    name="contactEmail"
                                    type="email"
                                    bind:value={$form.contactEmail}
                                    placeholder="you@example.com"
                                    autocomplete="email"
                                    required />
                                {#if $errors.contactEmail?.[0]}
                                    <p class="text-sm text-destructive">
                                        {$errors.contactEmail[0]}
                                    </p>
                                {/if}
                            </div>
                        </div>

                        <div
                            class="grid grid-cols-1 gap-3 {data.event.shirtsEnabled
                                ? 'sm:grid-cols-2'
                                : ''}">
                            <div class="space-y-1.5">
                                <label for="selfBirthDate" class="text-sm font-medium">
                                    Your birthday <span class="text-destructive">*</span>
                                </label>
                                <DatePicker
                                    id="selfBirthDate"
                                    bind:value={selfBirthDate}
                                    placeholder="Your birthday" />
                            </div>

                            {#if data.event.shirtsEnabled}
                                <div class="space-y-1.5">
                                    <label for="selfShirtSize" class="text-sm font-medium">
                                        T-shirt
                                        <span class="text-muted-foreground font-normal text-xs"
                                            >(optional)</span>
                                    </label>
                                    <Select.Root
                                        type="single"
                                        value={selfShirtSize}
                                        onValueChange={(v) => (selfShirtSize = v)}>
                                        <Select.Trigger id="selfShirtSize">
                                            <BitsSelect.Value placeholder="Select size…" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each SHIRT_SIZES as size (size)}
                                                <Select.Item value={size} label={size} />
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                            {/if}
                        </div>
                    </CardContent>
                </Card>

                <!-- Added party members -->
                {#if members.length > 0}
                    <div class="space-y-2">
                        {#each members as member, i (i)}
                            <div
                                class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm">{member.name}</p>
                                    <p class="text-xs text-muted-foreground">
                                        {getTierLabel(tierMap, member.tierId)}
                                        {#if member.birthDate}
                                            · Age {getMemberAge(member.birthDate)}
                                        {/if}
                                        {#if data.event.shirtsEnabled && member.shirtSize}
                                            · Size {member.shirtSize}
                                        {/if}
                                    </p>
                                </div>
                                <span class="text-sm font-medium tabular-nums shrink-0"
                                    >${getTierPrice(tierMap, member.tierId)}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                    onclick={() => handleRemoveMember(i)}>
                                    <Trash2 class="h-3.5 w-3.5" />
                                    <span class="sr-only">Remove {member.name}</span>
                                </Button>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if $errors.members?.[0]}
                    <p class="text-sm text-destructive">{$errors.members[0]}</p>
                {/if}

                <!-- Add person form / button -->
                {#if showAddForm}
                    <Card class="border-dashed">
                        <CardHeader class="pb-3">
                            <CardTitle class="text-base">Add a person</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-4">
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1.5">
                                    <label for="new-first" class="text-sm font-medium">
                                        First name <span class="text-destructive">*</span>
                                    </label>
                                    <Input
                                        id="new-first"
                                        type="text"
                                        bind:value={newFirstName}
                                        placeholder="First" />
                                </div>
                                <div class="space-y-1.5">
                                    <label for="new-last" class="text-sm font-medium">
                                        Last name <span class="text-destructive">*</span>
                                    </label>
                                    <Input
                                        id="new-last"
                                        type="text"
                                        bind:value={newLastName}
                                        placeholder="Last" />
                                </div>
                            </div>
                            <div
                                class="grid grid-cols-1 gap-3 {data.event.shirtsEnabled
                                    ? 'sm:grid-cols-2'
                                    : ''}">
                                <div class="space-y-1.5">
                                    <label for="new-bday" class="text-sm font-medium">
                                        Birthday <span class="text-destructive">*</span>
                                    </label>
                                    <DatePicker
                                        id="new-bday"
                                        bind:value={newBirthDate}
                                        placeholder="Their birthday" />
                                </div>

                                {#if data.event.shirtsEnabled}
                                    <div class="space-y-1.5">
                                        <label for="new-shirt" class="text-sm font-medium">
                                            T-shirt
                                            <span class="text-muted-foreground font-normal text-xs"
                                                >(optional)</span>
                                        </label>
                                        <Select.Root
                                            type="single"
                                            value={newShirtSize}
                                            onValueChange={(v) => (newShirtSize = v)}>
                                            <Select.Trigger id="new-shirt">
                                                <BitsSelect.Value placeholder="Select size…" />
                                            </Select.Trigger>
                                            <Select.Content>
                                                {#each SHIRT_SIZES as size (size)}
                                                    <Select.Item value={size} label={size} />
                                                {/each}
                                            </Select.Content>
                                        </Select.Root>
                                    </div>
                                {/if}
                            </div>
                            <div class="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!newFirstName.trim() ||
                                        !newLastName.trim() ||
                                        !newTierId ||
                                        !newBirthDate}
                                    onclick={handleAddMember}>
                                    Add to party
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onclick={handleCancelAdd}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                {:else}
                    <p class="text-sm text-muted-foreground">
                        Include children — we use this to plan programming and food.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        class="w-full border-dashed"
                        onclick={() => (showAddForm = true)}>
                        <Plus class="h-4 w-4 mr-2" />
                        Add another person
                    </Button>
                {/if}
            </div>

            <!-- Right: order summary (sticky on desktop) -->
            <div class="self-start lg:sticky lg:top-6">
                <Card>
                    <CardHeader class="pb-3">
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        {#if canSubmit}
                            <div class="space-y-2">
                                <div class="flex items-center justify-between text-sm">
                                    <span>
                                        {contactName || 'You'}
                                        <span class="text-muted-foreground text-xs">(you)</span>
                                    </span>
                                    <span class="tabular-nums">
                                        {selfTier ? `$${formatPrice(selfTier.priceCents)}` : ''}
                                    </span>
                                </div>
                                {#each members as member (member.name + member.tierId)}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="truncate mr-2">{member.name}</span>
                                        <span class="tabular-nums shrink-0"
                                            >${getTierPrice(tierMap, member.tierId)}</span>
                                    </div>
                                {/each}
                            </div>
                            <Separator />
                            <div class="space-y-1 text-sm">
                                <div
                                    class="flex items-center justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span class="tabular-nums">${formatPrice(subtotal)}</span>
                                </div>
                                <div
                                    class="flex items-center justify-between text-muted-foreground">
                                    <span>Processing fee</span>
                                    <span class="tabular-nums">${formatPrice(processingFee)}</span>
                                </div>
                            </div>
                            <Separator />
                            <div class="flex items-center justify-between font-semibold">
                                <span>Total</span>
                                <span>${formatPrice(total)}</span>
                            </div>
                            <Button type="submit" class="w-full">
                                Pay ${formatPrice(total)} & Register
                            </Button>
                            <p class="text-xs text-muted-foreground text-center">
                                You'll be redirected to a secure checkout.
                            </p>
                        {:else}
                            <p class="text-sm text-muted-foreground text-center py-6">
                                Enter your name, email, and birthday above to get started.
                            </p>
                        {/if}
                    </CardContent>
                </Card>
                <p class="text-xs text-muted-foreground text-center mt-3">
                    Already registered? <a class="underline" href="/register/recover"
                        >Resend management link</a>
                </p>
            </div>
        </div>
    </form>
{/if}
