<script lang="ts">
import { UserCircle } from '@lucide/svelte'
import { Select as BitsSelect } from 'bits-ui'
import { DatePicker } from '$lib/components'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import { parseBirthDate } from '$lib/utils/age'
import { getDefaultTierId } from './pricingUtils'
import type { PricingTier } from './pricingUtils'

let {
    email = $bindable(''),
    firstName = $bindable(''),
    lastName = $bindable(''),
    birthDate = $bindable(undefined as string | undefined),
    shirtSize = $bindable(''),
    // eslint-disable-next-line no-useless-assignment -- $effect overwrites this when birthDate is set; default is the empty-form fallback
    tierId = $bindable(''),
    tiers,
    shirtsEnabled = false,
    errors,
}: {
    email: string
    firstName: string
    lastName: string
    birthDate: string | undefined
    shirtSize: string
    tierId: string
    tiers: PricingTier[]
    shirtsEnabled?: boolean
    errors?: { email?: string; name?: string }
} = $props()

/* Auto-select tier from birthday so the registrant doesn't pick a category. */
$effect(() => {
    if (birthDate) {
        const parsed = parseBirthDate(birthDate)
        if (parsed) {
            const suggested = getDefaultTierId(tiers, parsed.birthYear)
            if (suggested) {
                tierId = suggested
            }
        }
    }
})
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
            <UserCircle class="h-5 w-5 text-muted-foreground" />
            Your Information
        </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
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

        <div class="grid grid-cols-1 gap-3 {shirtsEnabled ? 'sm:grid-cols-2' : ''}">
            <div class="space-y-1.5">
                <label for="selfBirthDate" class="text-sm font-medium">
                    Birthday <span class="text-destructive">*</span>
                </label>
                <DatePicker id="selfBirthDate" bind:value={birthDate} placeholder="Your birthday" />
            </div>

            {#if shirtsEnabled}
                <div class="space-y-1.5">
                    <label for="selfShirtSize" class="text-sm font-medium">
                        T-shirt
                        <span class="text-muted-foreground font-normal text-xs">(optional)</span>
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
    </CardContent>
</Card>
