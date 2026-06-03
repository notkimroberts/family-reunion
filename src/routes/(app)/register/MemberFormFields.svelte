<script lang="ts">
import { DatePicker } from '$lib/components'
import { Input } from '$lib/components/ui/input'
import { SHIRT_SIZES, SELECT_CLASS } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'

type Tier = { id: string; label: string; priceCents: number }

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
    tiers: Tier[]
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
        <select id="{idPrefix}-tier" bind:value={tierId} class={SELECT_CLASS}>
            <option value="">Select category…</option>
            {#each tiers as tier (tier.id)}
                <option value={tier.id}>{tier.label} — ${formatPrice(tier.priceCents)}</option>
            {/each}
        </select>
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
            <select id="{idPrefix}-shirt" bind:value={shirtSize} class={SELECT_CLASS}>
                <option value="">Select size…</option>
                {#each SHIRT_SIZES as size (size)}
                    <option value={size}>{size}</option>
                {/each}
            </select>
        </div>
    {/if}
</div>
