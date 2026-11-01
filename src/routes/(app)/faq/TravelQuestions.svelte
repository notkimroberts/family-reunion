<script lang="ts">
import { ExternalLink, Plane } from '@lucide/svelte'
import { ParkingList } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { HOST_HOTEL } from '$lib/general/constants'
import FaqFacts from './FaqFacts.svelte'
import FaqItem from './FaqItem.svelte'
import FaqSection from './FaqSection.svelte'

/* The two airports, nearest first. */
const AIRPORTS = [
    { code: 'OAK', name: 'Oakland', note: 'the closest and easiest' },
    { code: 'SFO', name: 'San Francisco', note: 'the next best choice' },
]
</script>

<FaqSection id="travel" title="Travel and stay" icon={Plane}>
    {#if HOST_HOTEL}
        <FaqItem question="Is there a host hotel? What does it cost?">
            <p>
                Yes. We hold a block of rooms at the <strong class="text-foreground"
                    >{HOST_HOTEL.name}</strong
                >{#if HOST_HOTEL.address}, {HOST_HOTEL.address}{/if}.
            </p>
            {#if HOST_HOTEL.details.length > 0}
                <FaqFacts rows={HOST_HOTEL.details} />
            {/if}
            {#if HOST_HOTEL.bookingUrl}
                <p>Book with our link to get the reunion rate:</p>
                <Button
                    href={HOST_HOTEL.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full">
                    Book a room
                    <ExternalLink class="size-4" />
                </Button>
            {/if}
        </FaqItem>

        {#if HOST_HOTEL.bookingDeadline}
            <FaqItem question="What is the deadline for the hotel room block?">
                <p>
                    Book by <strong class="text-foreground">{HOST_HOTEL.bookingDeadline}</strong>.
                    After that date, the hotel does not hold the reunion rate.
                </p>
            </FaqItem>
        {/if}

        <FaqItem question="How far is the venue from the host hotel?">
            <p>Only one block. You can walk from the hotel to the reunion.</p>
        </FaqItem>

        {#if HOST_HOTEL.parking?.length}
            <FaqItem question="Is there parking?">
                <p>Yes, at the host hotel and in public garages nearby:</p>
                <ParkingList options={HOST_HOTEL.parking} />
            </FaqItem>
        {/if}
    {/if}

    <FaqItem question="Which airport should I fly to?">
        <ul class="flex flex-col gap-3">
            {#each AIRPORTS as airport, index (airport.code)}
                <li class="flex items-center gap-3">
                    <span
                        class={[
                            'w-14 shrink-0 rounded-md py-1 text-center text-sm font-bold tracking-wider',
                            index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        ]}>{airport.code}</span>
                    <span>
                        <strong class="text-foreground">{airport.name}</strong> — {airport.note}
                    </span>
                </li>
            {/each}
        </ul>
    </FaqItem>

    <FaqItem question="Should I book my flight now?">
        <p>Yes! The earlier you book, the better.</p>
    </FaqItem>
</FaqSection>
