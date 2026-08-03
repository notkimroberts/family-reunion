<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { Separator } from '$lib/components/ui/separator'
import { SHIRT_SIZES } from '$lib/general/constants'
import { isValidZip } from '$lib/utils'
import AdditionalQuestionsFields from './AdditionalQuestionsFields.svelte'
import AddressFields from './AddressFields.svelte'
import TierSelect from './TierSelect.svelte'
import type { TierOption } from './types'

let {
    token,
    registrationId,
    tiers,
    shirtsEnabled,
    onCancel,
}: {
    token: string
    registrationId: string
    tiers: TierOption[]
    shirtsEnabled: boolean
    onCancel?: () => void
} = $props()

let name = $state('')
let tierId = $state('')
let birthDate = $state<string | undefined>(undefined)
let shirtSize = $state('')
let addressLine1 = $state('')
let addressLine2 = $state('')
let addressCity = $state('')
let addressState = $state('')
let addressZip = $state('')
let vegetarianMeal = $state<'yes' | 'no' | ''>('')
let attendedReunion2025 = $state<'yes' | 'no' | ''>('')
let submitting = $state(false)

let canSubmit = $derived(
    !!name.trim() &&
        !!tierId &&
        !!addressLine1.trim() &&
        !!addressCity.trim() &&
        !!addressState.trim() &&
        !!addressZip.trim() &&
        isValidZip(addressZip) &&
        !!vegetarianMeal &&
        !!attendedReunion2025,
)
</script>

<Card>
    <CardHeader>
        <CardTitle>Add a Member</CardTitle>
    </CardHeader>
    <CardContent>
        <form
            method="POST"
            action="?/add_member"
            use:enhance={() => {
                submitting = true
                return ({ result, update }) => {
                    submitting = false
                    if (result.type === 'redirect') {
                        update()
                    }
                }
            }}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="registrationId" value={registrationId} />
            <input type="hidden" name="birthDate" value={birthDate ?? ''} />
            <input type="hidden" name="tierId" value={tierId} />

            <div class="space-y-6">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <label for="add-name" class="text-sm font-medium">Name</label>
                        <Input
                            id="add-name"
                            name="name"
                            type="text"
                            bind:value={name}
                            placeholder="Full name"
                            required />
                    </div>
                    <div class="space-y-2">
                        <label for="add-tier" class="text-sm font-medium">Tier</label>
                        <TierSelect id="add-tier" bind:tierId {tiers} />
                    </div>
                    <div class="space-y-2">
                        <label for="add-birthDate" class="text-sm font-medium">
                            Birthday <span class="text-muted-foreground">(optional)</span>
                        </label>
                        <DatePicker
                            id="add-birthDate"
                            bind:value={birthDate}
                            placeholder="Select birthday" />
                    </div>
                    {#if shirtsEnabled}
                        <div class="space-y-2">
                            <label for="add-shirt" class="text-sm font-medium">
                                T-Shirt Size <span class="text-muted-foreground">(optional)</span>
                            </label>
                            <Select.Root
                                type="single"
                                value={shirtSize}
                                onValueChange={(v) => (shirtSize = v)}
                                name="shirtSize">
                                <Select.Trigger id="add-shirt" class="w-full">
                                    <BitsSelect.Value placeholder="No shirt" />
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="" label="No shirt" />
                                    {#each SHIRT_SIZES as size (size)}
                                        <Select.Item value={size} label={size} />
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    {/if}
                </div>

                <Separator />

                <div class="space-y-4">
                    <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Additional Questions
                    </p>
                    <AdditionalQuestionsFields
                        idPrefix="add"
                        withFieldNames
                        bind:vegetarianMeal
                        bind:attendedReunion2025 />
                </div>

                <Separator />

                <div class="space-y-4">
                    <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Mailing Address
                    </p>
                    <AddressFields
                        idPrefix="add-address"
                        withFieldNames
                        bind:addressLine1
                        bind:addressLine2
                        bind:addressCity
                        bind:addressState
                        bind:addressZip />
                </div>

                <div class="flex gap-2 justify-end pt-2">
                    {#if onCancel}
                        <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
                    {/if}
                    <Button type="submit" disabled={submitting || !canSubmit}>
                        {submitting ? 'Redirecting to checkout…' : 'Continue to Payment'}
                    </Button>
                </div>
            </div>
        </form>
    </CardContent>
</Card>
