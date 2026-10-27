<script lang="ts">
import { formatPrice } from '$lib/utils'

/* A person's price as the tier price, with any card fee under it in small type.

   priceCents is the stored price, which for a card place includes the fee (refunds read it), so the
   tier price is priceCents − cardFeeCents. Shown as stored, the same tier read $170.24 on a card row
   and $165.00 on a check row. One component for every table and card that prints a party, so they
   cannot drift. */
let { priceCents, cardFeeCents }: { priceCents: number; cardFeeCents: number } = $props()
</script>

<span class="text-right tabular-nums">
    ${formatPrice(priceCents - cardFeeCents)}
    {#if cardFeeCents > 0}
        <span class="text-muted-foreground block text-xs font-normal">
            + ${formatPrice(cardFeeCents)} card fee
        </span>
    {/if}
</span>
