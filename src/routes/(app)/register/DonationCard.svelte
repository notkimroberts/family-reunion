<script lang="ts">
import { HeartHandshake } from '@lucide/svelte'
import { DonationAmountPicker } from '$lib/components'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'

/* An optional gift on top of the party's places.

   Below the party builder rather than beside the total: it is a separate decision from what the
   places cost, and putting it in the order summary would read as a charge already added. Nothing
   here is preselected — a gift nobody chose is a gift nobody meant to give. */

type Props = {
    donationCents: number
    error?: string
}

let { donationCents = $bindable(0), error }: Props = $props()
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2">
            <HeartHandshake class="text-primary size-4" />
            Add a gift
        </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
        <p class="text-muted-foreground text-sm">
            Optional. Gifts help cover the venue, the food and the shirts, and keep the price of a
            place down for everyone.
        </p>
        <DonationAmountPicker
            bind:value={donationCents}
            clearable
            {error}
            idPrefix="register-gift" />
    </CardContent>
</Card>
