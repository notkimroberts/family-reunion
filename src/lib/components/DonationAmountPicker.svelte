<script lang="ts">
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import {
    DONATION_MAX_CENTS,
    DONATION_MIN_CENTS,
    DONATION_PRESET_CENTS,
} from '$lib/general/constants'
import { formatPrice } from '$lib/utils'

/* The amount half of every donation surface: the preset buttons plus an "Other amount" box.

   Shared by the gift card on /register and the form on /donate so the two offer the same figures
   and validate the same way. The value is CENTS, because that is what the schema, Stripe and the
   database all speak — dollars exist only inside the text box.

   The preset buttons are type="button" (the Button default), which matters: this renders inside the
   registration form, where a stray submit would open a checkout mid-edit. */

type Props = {
    /* Cents. 0 means no gift, which /register allows and /donate does not. */
    value: number
    /* Shows a "No gift" choice, for the registration form where a gift is optional. */
    clearable?: boolean
    /* Rendered under the input when the parent has a server-side error for this field. */
    error?: string
    idPrefix?: string
}

let { value = $bindable(0), clearable = false, error, idPrefix = 'donation' }: Props = $props()

/* Dollars as typed, kept as a string so a half-typed "12." is not rewritten under the cursor. Seeded
   from an incoming value that is not one of the presets — a deep link from the home page can carry
   any figure. */
let customDollars = $state(
    value > 0 && !DONATION_PRESET_CENTS.includes(value) ? (value / 100).toFixed(2) : '',
)

let usingCustom = $derived(customDollars.trim().length > 0)

function handlePreset(cents: number) {
    customDollars = ''
    /* Clicking the chosen amount again clears it, so a mis-tap is undoable without a second control
       when there is no "No gift" button to fall back on. */
    value = value === cents && !usingCustom ? 0 : cents
}

function handleCustomInput(event: Event) {
    const raw = (event.currentTarget as HTMLInputElement).value
    customDollars = raw
    const dollars = Number.parseFloat(raw)
    value = Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0
}

let belowMinimum = $derived(value > 0 && value < DONATION_MIN_CENTS)
let aboveMaximum = $derived(value > DONATION_MAX_CENTS)
</script>

<div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {#each DONATION_PRESET_CENTS as cents (cents)}
            <Button
                variant={!usingCustom && value === cents ? 'default' : 'outline'}
                aria-pressed={!usingCustom && value === cents}
                onclick={() => handlePreset(cents)}>
                ${formatPrice(cents)}
            </Button>
        {/each}
    </div>

    <div class="flex flex-col gap-1.5">
        <label for="{idPrefix}-custom" class="text-sm font-medium">Other amount</label>
        <div class="flex items-center gap-2">
            <span class="text-muted-foreground text-sm">$</span>
            <Input
                id="{idPrefix}-custom"
                type="text"
                inputmode="decimal"
                placeholder="0.00"
                value={customDollars}
                oninput={handleCustomInput} />
            {#if clearable && value > 0}
                <Button
                    variant="ghost"
                    onclick={() => {
                        customDollars = ''
                        value = 0
                    }}>
                    No gift
                </Button>
            {/if}
        </div>
        {#if belowMinimum}
            <p class="text-destructive text-sm">
                The smallest gift this form takes is ${formatPrice(DONATION_MIN_CENTS)}.
            </p>
        {:else if aboveMaximum}
            <p class="text-destructive text-sm">
                That is larger than this form accepts — please contact the organisers instead.
            </p>
        {:else if error}
            <p class="text-destructive text-sm">{error}</p>
        {/if}
    </div>
</div>
