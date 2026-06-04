<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import type { RegistrationPricingTier } from './types'

let {
    registrationId,
    tiers,
    shirtsEnabled,
    onCancel,
}: {
    registrationId: string
    tiers: RegistrationPricingTier[]
    shirtsEnabled: boolean
    onCancel?: () => void
} = $props()

let name = $state('')
let tierId = $state('')
let birthDate = $state<string | undefined>(undefined)
let shirtSize = $state('')
let submitting = $state(false)
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
            <input type="hidden" name="registrationId" value={registrationId} />
            <input type="hidden" name="birthDate" value={birthDate ?? ''} />

            <div class="space-y-4">
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
                        <label for="add-tier" class="text-sm font-medium">Category</label>
                        <Select.Root
                            type="single"
                            value={tierId}
                            onValueChange={(v) => (tierId = v)}
                            name="tierId">
                            <Select.Trigger id="add-tier">
                                <BitsSelect.Value placeholder="Select category" />
                            </Select.Trigger>
                            <Select.Content>
                                {#each tiers as tier (tier.id)}
                                    <Select.Item
                                        value={tier.id}
                                        label="{tier.label} — ${formatPrice(tier.priceCents)}" />
                                {/each}
                            </Select.Content>
                        </Select.Root>
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
                                <Select.Trigger id="add-shirt">
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

                <div class="flex gap-2 justify-end pt-2">
                    {#if onCancel}
                        <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
                    {/if}
                    <Button type="submit" disabled={submitting || !name.trim() || !tierId}>
                        {submitting ? 'Redirecting to checkout…' : 'Continue to Payment'}
                    </Button>
                </div>
            </div>
        </form>
    </CardContent>
</Card>
