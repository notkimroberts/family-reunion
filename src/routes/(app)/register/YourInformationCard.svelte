<script lang="ts">
import { UserCircle } from '@lucide/svelte'
import { Select as BitsSelect } from 'bits-ui'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import {
    formatPhoneInput,
    formatPrice,
    getCategoryPriceCents,
    getMemberAge,
    isValidPhone,
    REGISTRATION_CATEGORY_LABELS,
} from '$lib/utils'
import CategorySelect from './CategorySelect.svelte'

let {
    email = $bindable(''),
    phone = $bindable(''),
    firstName = $bindable(''),
    lastName = $bindable(''),
    birthDate = $bindable(undefined as string | undefined),
    shirtSize = $bindable(''),
    category = $bindable<RegistrationCategory | ''>(''),
    adultPriceCents,
    childPriceCents,
    shirtsEnabled = false,
    errors,
}: {
    email: string
    phone: string
    firstName: string
    lastName: string
    birthDate: string | undefined
    shirtSize: string
    category: RegistrationCategory | ''
    adultPriceCents: number
    childPriceCents: number
    shirtsEnabled?: boolean
    errors?: { email?: string; name?: string }
} = $props()

let saved = $state(false)

let phoneValid = $derived(!phone.trim() || isValidPhone(phone))
let canSave = $derived(
    !!firstName.trim() && !!lastName.trim() && !!email.trim() && !!category && phoneValid,
)
let age = $derived(getMemberAge(birthDate))
let categoryLabel = $derived(category ? REGISTRATION_CATEGORY_LABELS[category] : '')
let priceCents = $derived(
    category ? getCategoryPriceCents(category, { adultPriceCents, childPriceCents }) : 0,
)
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
            <UserCircle class="h-5 w-5 text-muted-foreground" />
            Your Information
        </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
        {#if saved}
            <div class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{firstName} {lastName}</p>
                    <p class="text-xs text-muted-foreground">
                        {categoryLabel}
                        {#if age !== undefined}
                            · Age {age}
                        {/if}
                        {#if shirtsEnabled && shirtSize}
                            · Size {shirtSize}
                        {/if}
                    </p>
                </div>
                <span class="text-sm font-medium tabular-nums shrink-0"
                    >${formatPrice(priceCents)}</span>
                <Button type="button" variant="outline" size="sm" onclick={() => (saved = false)}>
                    Edit
                </Button>
            </div>
        {:else}
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
                        <span class="text-muted-foreground font-normal text-xs">(optional)</span>
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
                        <p class="text-sm text-destructive">Please enter a valid phone number</p>
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

            <div
                class="grid grid-cols-1 gap-3 sm:grid-cols-2 {shirtsEnabled
                    ? 'lg:grid-cols-3'
                    : ''}">
                <div class="space-y-1.5">
                    <label for="selfCategory" class="text-sm font-medium">
                        Category <span class="text-destructive">*</span>
                    </label>
                    <CategorySelect
                        id="selfCategory"
                        bind:category
                        {adultPriceCents}
                        {childPriceCents} />
                </div>

                <div class="space-y-1.5">
                    <label for="selfBirthDate" class="text-sm font-medium">
                        Birthday
                        <span class="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <DatePicker
                        id="selfBirthDate"
                        bind:value={birthDate}
                        placeholder="Your birthday" />
                </div>

                {#if shirtsEnabled}
                    <div class="space-y-1.5">
                        <label for="selfShirtSize" class="text-sm font-medium">
                            T-shirt
                            <span class="text-muted-foreground font-normal text-xs"
                                >(optional)</span>
                        </label>
                        <Select.Root
                            type="single"
                            value={shirtSize}
                            onValueChange={(v) => (shirtSize = v)}>
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

            <div class="flex justify-end">
                <Button type="button" size="sm" disabled={!canSave} onclick={() => (saved = true)}>
                    Save
                </Button>
            </div>
        {/if}
    </CardContent>
</Card>
