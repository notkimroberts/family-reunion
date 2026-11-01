<script lang="ts">
import { PartyPopper } from '@lucide/svelte'
import { REUNION_LOCATIONS } from '$lib/general/constants'
import { formatDateRange } from '$lib/utils'
import { FAQ_LINK_CLASS } from './FAQ_LINK_CLASS'
import FaqItem from './FaqItem.svelte'
import FaqSection from './FaqSection.svelte'
import OrganizerEmail from './OrganizerEmail.svelte'

const venue = REUNION_LOCATIONS.find((location) => location.kind === 'venue')

let {
    startDate,
    endDate,
}: { startDate: Date | null | undefined; endDate: Date | null | undefined } = $props()

/* formatDateRange pins the reunion's zone, so the server and the browser print the same days. */
let dateRange = $derived(
    startDate ? formatDateRange(new Date(startDate), new Date(endDate ?? startDate)) : undefined,
)
</script>

<FaqSection id="weekend" title="The reunion weekend" icon={PartyPopper}>
    {#if dateRange || venue}
        <FaqItem question="When and where is the reunion?">
            {#if dateRange}
                <p><strong class="text-foreground">{dateRange}</strong></p>
            {/if}
            {#if venue}
                <p>
                    At {venue.name}{#if venue.address}, {venue.address}{/if}.
                    <a class={FAQ_LINK_CLASS} href="/#venue">Map and parking</a>
                </p>
            {/if}
        </FaqItem>
    {/if}

    <FaqItem question="What is the schedule? What is the program for the weekend?">
        <p>
            The organizers are still planning the program. We will post the schedule on this site
            closer to the reunion.
        </p>
    </FaqItem>

    <FaqItem question="What is the menu?">
        <p>
            The organizers are still deciding. We will post the menu on this site as soon as it is
            finalized.
        </p>
    </FaqItem>

    <FaqItem question="Is there a t-shirt or merch for the reunion?">
        <p>
            Yes! Merch is in the works and mock ups are available on the site. We will post pricing
            once we know it.
        </p>
    </FaqItem>
</FaqSection>
