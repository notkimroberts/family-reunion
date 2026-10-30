<script lang="ts">
import {
    BedDouble,
    ChevronDown,
    ExternalLink,
    Hotel,
    Info,
    MapPin,
    Navigation,
    SquareParking,
} from '@lucide/svelte'
import { InstagramIcon, ParkingList } from '$lib/components'
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

let hasDetails = $derived(location.details.length > 0 || Boolean(location.bookingDeadline))
let detailsLabel = $derived(location.kind === 'hotel' ? 'Room rates' : 'Details')
// Names what the fold holds, e.g. "Map, room rates & parking".
let moreLabel = $derived.by(() => {
    const parts = [
        'Map',
        ...(hasDetails ? [detailsLabel.toLowerCase()] : []),
        ...(location.parking?.length ? ['parking'] : []),
    ]
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} & ${parts.at(-1)}` : parts[0]
})
</script>

<!-- Compact on first load: photo thumbnail, name, address and the one action that runs out (the room
     block). The map, rates, parking and links sit in one native <details> below, so the section is a
     few lines tall until someone wants more. The map iframe is lazy, so a closed card loads no map. -->
<Card size="sm">
    <CardContent class="flex gap-4">
        {#if location.imageUrl}
            <img
                src={location.imageUrl}
                alt={location.name}
                loading="lazy"
                class="size-24 shrink-0 rounded-lg object-cover sm:size-28" />
        {:else}
            <div
                class="bg-muted flex size-24 shrink-0 items-center justify-center rounded-lg sm:size-28">
                {#if location.kind === 'hotel'}
                    <Hotel class="text-muted-foreground size-8" />
                {:else}
                    <MapPin class="text-muted-foreground size-8" />
                {/if}
            </div>
        {/if}
        <div class="flex min-w-0 flex-col gap-1">
            <div class="flex items-center gap-2">
                <Badge variant="secondary" class="w-fit">{location.badge}</Badge>
                {#if location.instagramUrl}
                    <a
                        href={location.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="{location.name} on Instagram">
                        <InstagramIcon class="size-4" />
                    </a>
                {/if}
            </div>
            <h3>{location.name}</h3>
            {#if location.address}
                <p class="text-sm font-medium">{location.address}</p>
            {/if}
            <p class="text-muted-foreground text-sm">{location.tagline}</p>
        </div>
    </CardContent>

    {#if location.bookingUrl}
        <CardContent class="flex flex-col gap-1">
            <Button
                href={location.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold">
                <BedDouble class="size-4" />
                Book the room block
                <ExternalLink class="size-4" />
            </Button>
            {#if location.bookingDeadline}
                <p class="text-muted-foreground text-center text-xs">
                    Our rate holds until {location.bookingDeadline}
                </p>
            {/if}
        </CardContent>
    {/if}

    <details class="group border-t">
        <summary
            class="flex cursor-pointer list-none items-center justify-between gap-2 px-4 pt-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            {moreLabel}
            <ChevronDown
                class="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div class="flex flex-col gap-4 px-4 pt-4">
            <div class="aspect-video w-full overflow-hidden rounded-lg border">
                <iframe
                    src={mapEmbedUrl}
                    title="Map of {location.name}"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                    class="h-full w-full border-0"></iframe>
            </div>

            {#if hasDetails}
                <div class="flex flex-col gap-2">
                    <p class="inline-flex items-center gap-1.5 text-sm font-medium">
                        {#if location.kind === 'hotel'}
                            <BedDouble class="text-muted-foreground size-4" />
                        {:else}
                            <Info class="text-muted-foreground size-4" />
                        {/if}
                        {detailsLabel}
                    </p>
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
                </div>
            {/if}

            {#if location.parking?.length}
                <div class="flex flex-col gap-2">
                    <p class="inline-flex items-center gap-1.5 text-sm font-medium">
                        <SquareParking class="text-muted-foreground size-4" />
                        Parking
                    </p>
                    <ParkingList options={location.parking} />
                </div>
            {/if}

            <!-- Outline, so booking stays the only filled button in the section. -->
            <div class="flex flex-col gap-2 sm:flex-row">
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
    </details>
</Card>
