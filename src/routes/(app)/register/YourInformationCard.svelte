<script lang="ts">
import { TriangleAlert, UserCircle } from '@lucide/svelte'
import { DatePicker } from '$lib/components'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import { isChildTierLabel } from '$lib/general/tiers'
import { formatPhoneInput, formatPrice, getMemberAge, isValidPhone } from '$lib/utils'
import AdditionalQuestionsFields from './AdditionalQuestionsFields.svelte'
import AddressFields from './AddressFields.svelte'
import ShirtSizeSelect from './ShirtSizeSelect.svelte'
import TierSelect from './TierSelect.svelte'
import { contactSaveProblems } from './contactSaveProblems'
import type { PersonDetails, TierOption } from './types'

let {
    email = $bindable(''),
    phone = $bindable(''),
    firstName = $bindable(''),
    lastName = $bindable(''),
    info = $bindable(),
    tiers,
    errors,
    saved = $bindable(false),
}: {
    email: string
    phone: string
    firstName: string
    lastName: string
    info: PersonDetails
    tiers: TierOption[]
    errors?: { email?: string; name?: string }
    /* Bindable so the page can require the contact to be saved before allowing submit. */
    saved?: boolean
} = $props()

/* The person booking and paying for the party is an adult, so a child place is not on offer for
   them. The server enforces the same rule on both create paths — hiding the option is a courtesy,
   not the guard. */
let contactTiers = $derived(tiers.filter((tier) => !isChildTierLabel(tier.label)))

let phoneValid = $derived(!phone.trim() || isValidPhone(phone))
let age = $derived(getMemberAge(info.birthDate))
let selectedTier = $derived(tiers.find((t) => t.id === info.tierId))

/* Shown only after a Save that could not go through. Recomputed live from that point on, so the
   list shrinks as the registrant fills fields in rather than going stale under them. A disabled
   button was what this replaced: it said no without saying why, on a form long enough for the
   missing field to be off screen. */
let saveAttempted = $state(false)
let problems = $derived(
    saveAttempted ? contactSaveProblems({ firstName, lastName, email, phone, details: info }) : [],
)

function handleSave() {
    saveAttempted = true

    if (contactSaveProblems({ firstName, lastName, email, phone, details: info }).length === 0) {
        saved = true
        saveAttempted = false
    }
}
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
            <UserCircle class="h-5 w-5 text-muted-foreground" />
            Your Information
        </CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
        {#if saved}
            <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{firstName} {lastName}</p>
                    <p class="text-xs text-muted-foreground">
                        {selectedTier?.label ?? ''}
                        {#if age !== undefined}
                            · Age {age}
                        {/if}
                        {#if info.shirtSize}
                            · Size {info.shirtSize}
                        {/if}
                    </p>
                </div>
                <span class="text-sm font-medium tabular-nums shrink-0"
                    >${formatPrice(selectedTier?.priceCents ?? 0)}</span>
                <Button type="button" variant="outline" size="sm" onclick={() => (saved = false)}>
                    Edit
                </Button>
            </div>
        {:else}
            {#if problems.length > 0}
                <Alert variant="destructive">
                    <TriangleAlert class="size-4" />
                    <AlertTitle>Please fix the following before saving</AlertTitle>
                    <AlertDescription>
                        <ul class="flex list-disc flex-col gap-1 pl-4">
                            {#each problems as problem (problem)}
                                <li>{problem}</li>
                            {/each}
                        </ul>
                    </AlertDescription>
                </Alert>
            {/if}

            <div class="space-y-4">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Contact Info
                </p>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="space-y-1.5">
                        <label for="contactEmail" class="text-sm font-medium">
                            Email <span class="text-destructive">*</span>
                        </label>
                        <Input
                            id="contactEmail"
                            name="contactEmail"
                            type="email"
                            bind:value={email}
                            placeholder="you@example.com"
                            autocomplete="email"
                            required />
                        {#if errors?.email}
                            <p class="text-sm text-destructive">{errors.email}</p>
                        {/if}
                    </div>
                    <div class="space-y-1.5">
                        <label for="contactPhone" class="text-sm font-medium">
                            Phone
                            <span class="text-muted-foreground font-normal text-xs"
                                >(optional)</span>
                        </label>
                        <Input
                            id="contactPhone"
                            name="contactPhone"
                            type="tel"
                            value={phone}
                            oninput={(e) => (phone = formatPhoneInput(e.currentTarget.value))}
                            placeholder="(555) 555-5555"
                            autocomplete="tel" />
                        {#if phone.trim() && !phoneValid}
                            <p class="text-sm text-destructive">
                                Please enter a valid phone number
                            </p>
                        {/if}
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="space-y-1.5">
                        <label for="contactFirstName" class="text-sm font-medium">
                            First name <span class="text-destructive">*</span>
                        </label>
                        <Input
                            id="contactFirstName"
                            type="text"
                            bind:value={firstName}
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
                            bind:value={lastName}
                            placeholder="Last"
                            autocomplete="family-name"
                            required />
                        {#if errors?.name}
                            <p class="text-sm text-destructive">{errors.name}</p>
                        {/if}
                    </div>
                </div>
                <!-- Birthday sits with the name and email it belongs to, not down in Registration
                     Details beside the tier and the shirt size. It is a fact about the person; those
                     are facts about their place at the reunion. -->
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="space-y-1.5">
                        <label for="selfBirthDate" class="text-sm font-medium">
                            Birthday
                            <span class="text-muted-foreground font-normal text-xs"
                                >(optional)</span>
                        </label>
                        <DatePicker
                            id="selfBirthDate"
                            bind:value={info.birthDate}
                            placeholder="Your birthday" />
                    </div>
                </div>
            </div>

            <Separator />

            <div class="space-y-4">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Mailing Address
                </p>
                <AddressFields
                    idPrefix="selfAddress"
                    bind:addressLine1={info.addressLine1}
                    bind:addressLine2={info.addressLine2}
                    bind:addressCity={info.addressCity}
                    bind:addressState={info.addressState}
                    bind:addressZip={info.addressZip}
                    required />
            </div>

            <Separator />

            <div class="space-y-4">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Registration Details
                </p>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="space-y-1.5">
                        <label for="selfTier" class="text-sm font-medium">
                            Tier <span class="text-destructive">*</span>
                        </label>
                        <!-- Adult tiers only. The person booking the party pays for it. -->
                        <TierSelect id="selfTier" bind:tierId={info.tierId} tiers={contactTiers} />
                    </div>

                    <div class="space-y-1.5">
                        <label for="selfShirtSize" class="text-sm font-medium">
                            T-shirt <span class="text-destructive">*</span>
                        </label>
                        <ShirtSizeSelect
                            id="selfShirtSize"
                            bind:value={() => info.shirtSize ?? '', (v) => (info.shirtSize = v)} />
                    </div>
                </div>

                <!-- The catering and turnout questions live here rather than under a heading of their
                     own. They are required, they are about this person's place at the reunion, and a
                     separate "Additional Questions" section below the Save button read as optional
                     extras — which is how an unanswered one became a Save that did nothing. -->
                <AdditionalQuestionsFields
                    idPrefix="self"
                    bind:vegetarianMeal={info.vegetarianMeal}
                    bind:attendedReunion2025={info.attendedReunion2025} />
            </div>

            <div class="flex justify-end">
                <Button type="button" size="sm" onclick={handleSave}>Save</Button>
            </div>
        {/if}
    </CardContent>
</Card>
