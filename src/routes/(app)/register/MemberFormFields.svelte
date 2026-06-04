<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
import { DatePicker } from '$lib/components'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import type { MemberFormTier } from './types'

let {
    name = $bindable(''),
    tierId = $bindable(''),
    birthDate = $bindable(undefined as string | undefined),
    shirtSize = $bindable(''),
    tiers,
    shirtsEnabled = false,
    compact = false,
    idPrefix = 'member',
}: {
    name: string
    tierId: string
    birthDate: string | undefined
    shirtSize: string
    tiers: MemberFormTier[]
    shirtsEnabled?: boolean
    compact?: boolean
    idPrefix?: string
} = $props()

const optLabel = $derived(compact ? '(opt.)' : '(optional)')
</script>

<div
    class={compact
        ? 'grid grid-cols-2 gap-2 sm:grid-cols-4'
        : `grid grid-cols-1 gap-2 sm:grid-cols-2 ${shirtsEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
    <div class="space-y-1">
        <label for="{idPrefix}-name" class="text-xs font-medium">
            Name <span class="text-destructive">*</span>
        </label>
        <Input id="{idPrefix}-name" type="text" bind:value={name} placeholder="Full name" />
    </div>
    <div class="space-y-1">
        <label for="{idPrefix}-tier" class="text-xs font-medium">
            Category <span class="text-destructive">*</span>
        </label>
        <Select.Root type="single" value={tierId} onValueChange={(v) => (tierId = v)}>
            <Select.Trigger id="{idPrefix}-tier">
                <BitsSelect.Value placeholder="Select category…" />
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
    <div class="space-y-1">
        <label for="{idPrefix}-bday" class="text-xs font-medium">
            Birthday <span class="text-muted-foreground/70 font-normal">{optLabel}</span>
        </label>
        <DatePicker id="{idPrefix}-bday" bind:value={birthDate} placeholder="Optional" />
    </div>
    {#if shirtsEnabled}
        <div class="space-y-1">
            <label for="{idPrefix}-shirt" class="text-xs font-medium">
                T-shirt <span class="text-muted-foreground/70 font-normal">{optLabel}</span>
            </label>
            <Select.Root type="single" value={shirtSize} onValueChange={(v) => (shirtSize = v)}>
                <Select.Trigger id="{idPrefix}-shirt">
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
