<script lang="ts">
import {
    BedDouble,
    ExternalLink,
    Hotel,
    Info,
    MapPin,
    Navigation,
    SquareParking,
} from '@lucide/svelte'
import { InstagramIcon, LocationDisclosure, ParkingList } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import type { ReunionLocation } from '$lib/general/constants'

let { location }: { location: ReunionLocation } = $props()

/* Keyless Google Maps endpoints — both take a free-text query (see mapQuery), so no API key.
   output=embed is the documented iframe form. */
let mapEmbedUrl = $derived(
    `https://www.google.com/maps?q=${encodeURIComponent(location.mapQuery)}&output=embed`,
)
let directionsUrl = $derived(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.mapQuery)}`,
)
</script>

<!-- Four rows on the parent grid's SUBGRID — photo, heading, map, actions — so each row is as tall
     as the taller card's and lines up across the pair. As two independent flex columns they drifted:
     the hotel has a Room rates section the venue does not, which pushed its map a row lower, and the
     venue's buttons sat under a gap. ReunionLocations' parent must be the grid, which it is on /.
     Without subgrid support (iOS < 16) the rows just stack, unaligned but intact.

     gap-5 on the card, and no top padding on the content: the card's own gap already separates the
     photo from the heading, and adding pt-6 on top of it doubled the space. -->
<Card class="row-span-4 grid grid-rows-subgrid gap-5">
    {#if location.imageUrl}
        <img
            src={location.imageUrl}
            alt={location.name}
            loading="lazy"
            class="aspect-video w-full object-cover" />
    {:else}
        <!-- Flat placeholder until a photo is added; no gradient, matching the app's surfaces. -->
        <div class="bg-muted flex aspect-video w-full items-center justify-center border-b">
            {#if location.kind === 'hotel'}
                <Hotel class="text-muted-foreground size-10" />
            {:else}
                <MapPin class="text-muted-foreground size-10" />
            {/if}
        </div>
    {/if}

    <CardContent class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
            <Badge variant="secondary" class="w-fit">{location.badge}</Badge>
            {#if location.instagramUrl}
                <a
                    href={location.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                    aria-label="{location.name} on Instagram">
                    <InstagramIcon class="size-4" />
                    Instagram
                </a>
            {/if}
        </div>
        <h3>{location.name}</h3>
        {#if location.address}
            <p class="inline-flex items-center gap-1.5 text-sm font-medium">
                <MapPin class="text-muted-foreground size-4 shrink-0" />
                {location.address}
            </p>
        {/if}
        <p class="text-muted-foreground text-sm">{location.tagline}</p>
    </CardContent>

    <!-- Above the collapsible sections, so opening one never moves the map. -->
    <CardContent>
        <div class="aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
                src={mapEmbedUrl}
                title="Map of {location.name}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                class="h-full w-full border-0"></iframe>
        </div>
    </CardContent>

    <!-- Sections at the top of the row, buttons pinned to its foot with mt-auto: the hotel has one
         more section and one more button than the venue, and this keeps both cards' buttons on the
         same baseline with any difference as one gap between. Sections start collapsed so the gap
         stays small. -->
    <CardContent class="flex flex-col gap-4">
        {#if location.details.length > 0 || location.bookingDeadline}
            <LocationDisclosure
                label={location.kind === 'hotel' ? 'Room rates' : 'Details'}
                icon={location.kind === 'hotel' ? BedDouble : Info}>
                <dl class="flex flex-col gap-2 text-sm">
                    {#each location.details as detail (detail.label)}
                        <div class="flex items-baseline justify-between gap-3">
                            <dt class="text-muted-foreground">{detail.label}</dt>
                            <dd class="font-medium">{detail.value}</dd>
                        </div>
                    {/each}
                    <!-- Last, directly under the rates: the price and its expiry are one fact. -->
                    {#if location.bookingDeadline}
                        <div class="flex items-baseline justify-between gap-3">
                            <dt class="text-muted-foreground">Rate holds until</dt>
                            <dd class="font-medium">{location.bookingDeadline}</dd>
                        </div>
                    {/if}
                </dl>
            </LocationDisclosure>
        {/if}

        {#if location.parking?.length}
            <LocationDisclosure label="Parking" icon={SquareParking}>
                <ParkingList options={location.parking} />
            </LocationDisclosure>
        {/if}

        <div class="mt-auto flex flex-col gap-2">
            <!-- A row of its own, not a third sibling below: three buttons on one row overflow at
                 375px. The ONE filled button across both cards, taller and heavier than the rest:
                 rooms are what runs out, and the deadline under it is the reason to act now rather
                 than file it. -->
            {#if location.bookingUrl}
                <Button
                    href={location.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="lg"
                    class="h-12 text-base font-semibold">
                    <BedDouble class="size-5" />
                    Book the room block
                    <ExternalLink class="size-4" />
                </Button>
                {#if location.bookingDeadline}
                    <p class="text-muted-foreground text-center text-xs">
                        Our rate holds until {location.bookingDeadline}
                    </p>
                {/if}
            {/if}
            <div class="flex flex-col gap-2 sm:flex-row">
                <!-- Outline on both cards, so booking is the only filled button in the section. -->
                <Button
                    href={location.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    class="sm:flex-1">
                    Visit website
                    <ExternalLink class="size-4" />
                </Button>
                <Button
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    class="sm:flex-1">
                    Directions
                    <Navigation class="size-4" />
                </Button>
            </div>
        </div>
    </CardContent>
</Card>
