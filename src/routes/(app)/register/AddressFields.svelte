<script lang="ts">
import { Input } from '$lib/components/ui/input'
import { isValidZip } from '$lib/utils'
import StateSelect from './StateSelect.svelte'

let {
    idPrefix,
    addressLine1 = $bindable(''),
    addressLine2 = $bindable(''),
    addressCity = $bindable(''),
    addressState = $bindable(''),
    addressZip = $bindable(''),
    required = false,
    withFieldNames = false,
}: {
    idPrefix: string
    addressLine1: string
    addressLine2?: string
    addressCity: string
    addressState: string
    addressZip: string
    required?: boolean
    withFieldNames?: boolean
} = $props()
</script>

<div class="space-y-1.5">
    <label for="{idPrefix}-line1" class="text-sm font-medium">
        Street address <span class="text-destructive">*</span>
    </label>
    <Input
        id="{idPrefix}-line1"
        name={withFieldNames ? 'addressLine1' : undefined}
        type="text"
        bind:value={addressLine1}
        placeholder="Street address"
        autocomplete="address-line1"
        {required} />
</div>
<div class="space-y-1.5">
    <label for="{idPrefix}-line2" class="text-sm font-medium">
        Apt / suite
        <span class="text-muted-foreground text-xs font-normal">(optional)</span>
    </label>
    <Input
        id="{idPrefix}-line2"
        name={withFieldNames ? 'addressLine2' : undefined}
        type="text"
        bind:value={addressLine2}
        placeholder="Apt, suite, etc."
        autocomplete="address-line2" />
</div>
<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div class="space-y-1.5">
        <label for="{idPrefix}-city" class="text-sm font-medium">
            City <span class="text-destructive">*</span>
        </label>
        <Input
            id="{idPrefix}-city"
            name={withFieldNames ? 'addressCity' : undefined}
            type="text"
            bind:value={addressCity}
            placeholder="City"
            autocomplete="address-level2"
            {required} />
    </div>
    <div class="space-y-1.5">
        <label for="{idPrefix}-state" class="text-sm font-medium">
            State <span class="text-destructive">*</span>
        </label>
        <StateSelect
            id="{idPrefix}-state"
            name={withFieldNames ? 'addressState' : undefined}
            bind:value={addressState} />
    </div>
    <div class="space-y-1.5">
        <label for="{idPrefix}-zip" class="text-sm font-medium">
            ZIP code <span class="text-destructive">*</span>
        </label>
        <!-- inputmode, not type="number". A ZIP is a string of digits, not a quantity: type="number"
             strips a leading zero — every ZIP in New England and New Jersey starts with one — and
             hangs a spinner off a field nobody increments. inputmode only chooses the on-screen
             keyboard and leaves the value alone.

             TRADEOFF: iOS's numeric pad has no hyphen, so ZIP+4 cannot be typed on a phone. isValidZip
             still accepts it, desktop is unaffected, and the five-digit form is what an address needs. -->
        <Input
            id="{idPrefix}-zip"
            name={withFieldNames ? 'addressZip' : undefined}
            type="text"
            inputmode="numeric"
            bind:value={addressZip}
            placeholder="ZIP code"
            autocomplete="postal-code"
            {required} />
        {#if addressZip.trim() && !isValidZip(addressZip)}
            <p class="text-destructive text-sm">Please enter a valid ZIP code</p>
        {/if}
    </div>
</div>
