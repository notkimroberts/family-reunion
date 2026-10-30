<script lang="ts">
import { LoaderCircle } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { formatUsd } from '$lib/utils'

/* The running total and the ONE next action, pinned to the bottom of the screen while the form is in
   view. Registrants watched filling in the form could not find the small Save at the foot of Your
   Information, and Pay does not exist until it is pressed. So until the contact is saved this button
   saves it from wherever the reader is (the card scrolls up to its problem list if anything is
   missing); then it brings the hotel question into view until it is answered; then the scam notice's
   checkbox until that is ticked; after, it is the Pay button. Each step is named because the cards
   they point at can be a screen away on a phone, and a Pay the client refuses scrolls nowhere the
   reader is looking. The button leaves the amount out because the total is beside it, and
   "Pay $1,320.72 & Register" would crowd that total off a 375px screen.

   Sticky, not fixed: past the end of the form it comes to rest there instead of covering the
   footer, and the page needs no padding to keep its last card clear. */

let {
    totalCents,
    peopleCount,
    hasGift,
    canSubmit,
    hotelAnswered,
    acknowledged,
    submitting,
    onsave,
    onhotel,
    onacknowledge,
}: {
    totalCents: number
    peopleCount: number
    hasGift: boolean
    canSubmit: boolean
    /* Whether the host-hotel question has an answer. Required by the schema, and below the cards a
       registrant fills in first. */
    hotelAnswered: boolean
    /* Whether the scam notice has been confirmed. Between Save and Pay there is this one more step,
       and the bar names it rather than offering a Pay the server would refuse. */
    acknowledged: boolean
    submitting: boolean
    onsave: () => void
    onhotel: () => void
    onacknowledge: () => void
} = $props()
</script>

<div
    class="bg-card sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center gap-4 rounded-xl border px-4 py-3 shadow-lg md:px-6">
    <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-lg font-semibold tabular-nums">{formatUsd(totalCents)}</span>
        <span class="text-muted-foreground text-xs">
            {peopleCount}
            {peopleCount === 1 ? 'person' : 'people'}{hasGift ? ' + gift' : ''}
        </span>
    </div>
    {#if canSubmit && !hotelAnswered}
        <Button type="button" size="lg" class="text-base" onclick={onhotel}>
            Answer the hotel question
        </Button>
    {:else if canSubmit && !acknowledged}
        <Button type="button" size="lg" class="text-base" onclick={onacknowledge}>
            Read the safety notice
        </Button>
    {:else if canSubmit}
        <Button type="submit" size="lg" class="text-base" disabled={submitting}>
            {#if submitting}
                <LoaderCircle class="size-4 animate-spin" />
                Redirecting…
            {:else}
                Pay & Register
            {/if}
        </Button>
    {:else}
        <Button type="button" size="lg" class="text-base" onclick={onsave}>
            Save your details
        </Button>
    {/if}
</div>
