<script lang="ts">
import { NativeSelect } from '$lib/components/ui/native-select'
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
    <!-- No prices here. Tiers are age bands, not a menu — nobody chooses to be a Child — so pricing
         them like options invites a decision that is not on offer. The prices are listed in the order
         summary instead, where they read as information rather than a choice. -->
    <option value="" disabled>Select tier…</option>
    {#each tiers as tier (tier.id)}
        <option value={tier.id}>{tier.label}</option>
    {/each}
</NativeSelect>
