<script lang="ts">
import { DatePicker } from '$lib/components'
import { Input } from '$lib/components/ui/input'
import { formatPrice } from '$lib/utils'
import ShirtSizeSelect from '../../../../../register/ShirtSizeSelect.svelte'
import TierSelect from '../../../../../register/TierSelect.svelte'
import YesNoSelect from '../../../../../register/YesNoSelect.svelte'
import type { TierOption } from '../../../../../register/types'
import type { MemberRow } from './memberRow'

/* The editable fields for one attendee.

   Shared by the contact — whose fields sit inside the Contact card, since they are the same person as
   the name and email above — and by everyone else in the party. Written once so the two cannot drift
   apart in layout or in what they collect, which is the same class of mistake as storing a name twice.

   showName is false for the contact: their name is edited in the Contact card and would otherwise
   appear on screen twice, which is exactly what was confusing. */
let {
    row = $bindable(),
    tiers,
    isPaid,
    showName = true,
    disabled = false,
}: {
    row: MemberRow
    tiers: TierOption[]
    isPaid: boolean
    showName?: boolean
    disabled?: boolean
} = $props()
</script>

<div class="flex flex-col gap-3">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        {#if showName}
            <div class="flex flex-col gap-1.5">
                <label for="name-{row.memberId}" class="text-sm font-medium">
                    Name <span class="text-destructive">*</span>
                </label>
                <Input id="name-{row.memberId}" type="text" bind:value={row.name} {disabled} />
            </div>
        {/if}
        <div class="flex flex-col gap-1.5">
            <label for="tier-{row.memberId}" class="text-sm font-medium">
                Registration Tier <span class="text-destructive">*</span>
            </label>
            {#if isPaid}
                <Input
                    id="tier-{row.memberId}"
                    type="text"
                    value="{tiers.find((t) => t.id === row.tierId)?.label ??
                        'Unknown'} — ${formatPrice(row.priceCents)}"
                    disabled />
                <p class="text-muted-foreground text-xs">
                    Locked: this party has paid, so changing a tier owes a refund.
                </p>
            {:else}
                <TierSelect id="tier-{row.memberId}" bind:tierId={row.tierId} {tiers} />
            {/if}
        </div>
        <div class="flex flex-col gap-1.5">
            <label for="shirt-{row.memberId}" class="text-sm font-medium">
                T-shirt <span class="text-destructive">*</span>
            </label>
            <ShirtSizeSelect
                id="shirt-{row.memberId}"
                bind:value={row.shirtSize}
                emptyLabel="Not recorded" />
        </div>
        <div class="flex flex-col gap-1.5">
            <label for="dob-{row.memberId}" class="text-sm font-medium">Birthday</label>
            <DatePicker
                id="dob-{row.memberId}"
                bind:value={row.birthDate}
                placeholder="Not recorded" />
        </div>
        <div class="flex flex-col gap-1.5">
            <label for="veg-{row.memberId}" class="text-sm font-medium">Vegetarian meal?</label>
            <YesNoSelect
                id="veg-{row.memberId}"
                bind:value={row.vegetarianMeal}
                allowClear
                clearLabel="Not answered" />
        </div>
        <div class="flex flex-col gap-1.5">
            <label for="attended-{row.memberId}" class="text-sm font-medium">Attended 2025?</label>
            <YesNoSelect
                id="attended-{row.memberId}"
                bind:value={row.attendedReunion2025}
                allowClear
                clearLabel="Not answered" />
        </div>
    </div>
</div>
