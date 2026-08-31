<script lang="ts">
import { BedDouble } from '@lucide/svelte'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { NativeSelect } from '$lib/components/ui/native-select'
import { HOST_HOTEL } from '$lib/general/constants'
import type { HotelStayAnswer } from '$lib/general/constants'

/* Whether this party will stay at the host hotel, asked because the organisers hold a block of rooms
   and the number they hold is guesswork without it.

   ONE QUESTION PER BOOKING, not per attendee: a household books rooms together, and asking each
   person would produce a party of four with four contradictory answers and no room count.

   Renders nothing when no host hotel is listed — REUNION_LOCATIONS is a plain constant an organiser
   edits, and a year with no hotel is a legitimate state. The schema still requires an answer, so the
   page seeds 'undecided' in that case; see register/+page.svelte. */

/* Wording is specific to this question rather than shared with the admin column, which says
   "Elsewhere" in a table cell where a sentence does not fit. */
const ANSWER_LABELS: Record<HotelStayAnswer, string> = {
    yes: 'Yes, we plan to stay there',
    no: 'No, we have somewhere else',
    undecided: 'Not sure yet',
}

let {
    stayingAtHostHotel = $bindable<HotelStayAnswer | ''>(''),
    error,
}: {
    stayingAtHostHotel: HotelStayAnswer | ''
    error?: string
} = $props()
</script>

{#if HOST_HOTEL}
    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2">
                <BedDouble class="text-primary size-4" />
                Where you'll stay
            </CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
            <div class="space-y-1.5">
                <label for="stayingAtHostHotel" class="text-sm font-medium">
                    Will your party stay at {HOST_HOTEL.name}?
                    <span class="text-destructive">*</span>
                </label>
                <NativeSelect id="stayingAtHostHotel" bind:value={stayingAtHostHotel}>
                    <!-- Disabled prompt, not a selectable blank: the answer is required, and
                         'undecided' is already the honest choice for someone who does not know. -->
                    <option value="" disabled>Select…</option>
                    {#each Object.entries(ANSWER_LABELS) as [answer, label] (answer)}
                        <option value={answer}>{label}</option>
                    {/each}
                </NativeSelect>
                {#if error}
                    <p class="text-destructive text-sm">{error}</p>
                {/if}
            </div>
            <p class="text-muted-foreground text-sm">
                {HOST_HOTEL.name} is <strong class="text-foreground">half a block</strong> from the reunion.
                Your answer tells us how many rooms to secure, so please answer even if you are not certain
                — "not sure yet" is genuinely useful.
            </p>
        </CardContent>
    </Card>
{/if}
