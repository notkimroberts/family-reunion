<script lang="ts">
import * as Select from '$lib/components/ui/select'
import { formatPrice } from '$lib/utils'
import type { TierOption } from './types'

let {
    tierId = $bindable(''),
    tiers,
    id,
}: {
    tierId: string
    tiers: TierOption[]
    id?: string
} = $props()

let selected = $derived(tiers.find((t) => t.id === tierId))
</script>

<Select.Root type="single" value={tierId} onValueChange={(v) => (tierId = v)}>
    <Select.Trigger {id} class="w-full">
        {#if selected}
            {selected.label} — ${formatPrice(selected.priceCents)}
        {:else}
            <span class="text-muted-foreground">Select tier…</span>
        {/if}
    </Select.Trigger>
    <Select.Content>
        {#each tiers as tier (tier.id)}
            <Select.Item value={tier.id} label="{tier.label} — ${formatPrice(tier.priceCents)}" />
        {/each}
    </Select.Content>
</Select.Root>
