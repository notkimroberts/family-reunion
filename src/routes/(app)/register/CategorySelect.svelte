<script lang="ts">
import * as Select from '$lib/components/ui/select'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import { formatPrice, getCategoryPriceCents, REGISTRATION_CATEGORY_LABELS } from '$lib/utils'

let {
    category = $bindable<RegistrationCategory | ''>(''),
    adultPriceCents,
    childPriceCents,
    id,
}: {
    category: RegistrationCategory | ''
    adultPriceCents: number
    childPriceCents: number
    id?: string
} = $props()

let selectedPriceCents = $derived(
    category ? getCategoryPriceCents(category, { adultPriceCents, childPriceCents }) : 0,
)
</script>

<Select.Root
    type="single"
    value={category}
    onValueChange={(v) => (category = v as RegistrationCategory)}>
    <Select.Trigger {id} class="w-full">
        {#if category}
            {REGISTRATION_CATEGORY_LABELS[category]} — ${formatPrice(selectedPriceCents)}
        {:else}
            <span class="text-muted-foreground">Select category…</span>
        {/if}
    </Select.Trigger>
    <Select.Content>
        <Select.Item
            value="adult"
            label="{REGISTRATION_CATEGORY_LABELS.adult} — ${formatPrice(adultPriceCents)}" />
        <Select.Item
            value="child"
            label="{REGISTRATION_CATEGORY_LABELS.child} — ${formatPrice(childPriceCents)}" />
    </Select.Content>
</Select.Root>
