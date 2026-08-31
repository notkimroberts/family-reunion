<script lang="ts">
import { BedDouble, ExternalLink, Hotel } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { HOST_HOTEL } from '$lib/general/constants'

/* Book a room: the next thing to do once a place is paid for, and the only part of a reunion that
   sells out while you think about it. Deliberately the loudest thing under the confirmation —
   primary-tinted, photographed, large button — because as a plain muted card it read as a footnote to
   the party table.

   Renders nothing when no host hotel is listed; see HOST_HOTEL. */
</script>

{#if HOST_HOTEL}
    <Card class="border-primary/40 bg-primary/5 overflow-hidden">
        <CardContent
            class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5">
            {#if HOST_HOTEL.imageUrl}
                <img
                    src={HOST_HOTEL.imageUrl}
                    alt={HOST_HOTEL.name}
                    loading="lazy"
                    class="aspect-video w-full rounded-lg object-cover sm:aspect-square sm:size-28 sm:shrink-0" />
            {:else}
                <!-- Flat placeholder, matching LocationCard: a hotel with no photo yet must not leave
                     a broken-looking gap. -->
                <div
                    class="bg-muted flex aspect-video w-full items-center justify-center rounded-lg sm:aspect-square sm:size-28 sm:shrink-0">
                    <Hotel class="text-muted-foreground size-8" />
                </div>
            {/if}

            <div class="flex flex-1 flex-col gap-3">
                <div class="flex flex-col gap-1">
                    <p
                        class="text-primary inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                        <BedDouble class="size-4 shrink-0" />
                        Next step
                    </p>
                    <p class="text-lg font-semibold">Book your room at {HOST_HOTEL.name}</p>
                    <p class="text-muted-foreground text-sm">
                        {HOST_HOTEL.tagline} Booked directly with the hotel, not through this site.
                    </p>
                </div>

                <Button
                    href={HOST_HOTEL.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="lg"
                    class="w-full sm:w-fit">
                    Book at {HOST_HOTEL.name}
                    <ExternalLink class="size-4" />
                </Button>
            </div>
        </CardContent>
    </Card>
{/if}
