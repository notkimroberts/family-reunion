<script lang="ts">
import { NativeSelect } from '$lib/components/ui/native-select'
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
</script>

<NativeSelect {id} bind:value={tierId}>
    <option value="" disabled>Select tier…</option>
    {#each tiers as tier (tier.id)}
        <option value={tier.id}>{tier.label} — ${formatPrice(tier.priceCents)}</option>
    {/each}
</NativeSelect>
