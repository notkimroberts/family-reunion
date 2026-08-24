<script lang="ts">
import { ExternalLink, Hotel, MapPin, Navigation } from '@lucide/svelte'
import { InstagramIcon } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import type { ReunionLocation } from '$lib/general/constants'

let { location }: { location: ReunionLocation } = $props()

/* Keyless Google Maps endpoints — both take a business name, so no API key and no
   hard-coded street address. output=embed is the documented iframe form. */
let mapEmbedUrl = $derived(
    `https://www.google.com/maps?q=${encodeURIComponent(location.mapQuery)}&output=embed`,
)
let directionsUrl = $derived(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.mapQuery)}`,
)
</script>

<Card class="flex h-full flex-col overflow-hidden">
    {#if location.imageUrl}
        <img
            src={location.imageUrl}
            alt={location.name}
            loading="lazy"
            class="aspect-video w-full object-cover" />
    {:else}
        <!-- Flat placeholder until a photo is added; no gradient, matching the app's surfaces. -->
        <div class="flex aspect-video w-full items-center justify-center border-b bg-muted">
            {#if location.kind === 'hotel'}
                <Hotel class="size-10 text-muted-foreground" />
            {:else}
                <MapPin class="size-10 text-muted-foreground" />
            {/if}
        </div>
    {/if}

    <CardContent class="flex flex-1 flex-col gap-4 pt-6">
        <div class="flex flex-col gap-2">
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
            <p class="text-muted-foreground text-sm">{location.tagline}</p>
        </div>

        {#if location.details.length > 0}
            <dl class="flex flex-col gap-2 text-sm">
                {#each location.details as detail (detail.label)}
                    <div class="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                        <dt class="text-muted-foreground shrink-0 sm:w-28">{detail.label}</dt>
                        <dd class="font-medium">{detail.value}</dd>
                    </div>
                {/each}
            </dl>
        {/if}

        <div class="aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
                src={mapEmbedUrl}
                title="Map of {location.name}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                class="h-full w-full border-0"></iframe>
        </div>

        <!-- mt-auto keeps the buttons aligned across cards of differing content height. -->
        <div class="mt-auto flex flex-col gap-2 sm:flex-row">
            <Button
                href={location.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
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
    </CardContent>
</Card>
