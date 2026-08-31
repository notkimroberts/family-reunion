<script lang="ts">
import { CalendarDays, Compass, MapPin, Users, Utensils } from '@lucide/svelte'
import { StayConnected } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { APP_NAME } from '$lib/general/constants'
import LocationMap from './LocationMap.svelte'
import ScheduleCard from './ScheduleCard.svelte'

let { data } = $props()

let dateRange = $derived.by(() => {
    if (!data.event?.startDate) {
        return ''
    }
    const start = new Date(data.event.startDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
    })
    const end = new Date(data.event.endDate ?? data.event.startDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
    return `${start} – ${end}`
})

/* Everything below the dates comes out of one jsonb column — see $lib/general/reunionMetadata. Each
   key is optional, so each section keeps its own presence check. */
let metadata = $derived(data.event?.metadata)

let venueCity = $derived.by(() => {
    if (!metadata?.venue?.address) {
        return ''
    }
    const parts = metadata.venue.address.split(',')
    return parts.slice(-2).join(',').trim()
})

let mapsUrl = $derived(
    metadata?.venue?.address
        ? `https://maps.google.com/?q=${encodeURIComponent(metadata.venue.address)}`
        : '',
)

let hasFood = $derived((metadata?.menu?.length ?? 0) > 0 || (metadata?.drinks?.length ?? 0) > 0)

let hasThingsToDo = $derived(
    (metadata?.sites?.length ?? 0) > 0 || (metadata?.activities?.length ?? 0) > 0,
)
</script>

<svelte:head>
    <title>Program — {APP_NAME}</title>
</svelte:head>

{#if !data.event}
    <section class="col-span-12 py-16 text-center">
        <p class="text-muted-foreground text-lg">
            Check back soon for details about the next reunion!
        </p>
    </section>
{:else}
    <!-- Hero -->
    <section class="col-span-12">
        <div class="bg-primary text-primary-foreground rounded-2xl px-6 py-10 md:px-12 md:py-14">
            <p
                class="text-primary-foreground/70 mb-3 text-sm font-semibold tracking-widest uppercase">
                {data.isPastProgram ? 'Past Reunion' : 'Patterson Family'}
            </p>
            <h1>{data.event.title}</h1>
            <div class="mt-5 mb-6 flex flex-col gap-2">
                {#if dateRange}
                    <div class="flex items-center gap-2">
                        <CalendarDays class="size-4 shrink-0 opacity-70" />
                        <span class="text-lg font-medium">{dateRange}</span>
                    </div>
                {/if}
                {#if metadata?.venue}
                    <div class="flex items-center gap-2">
                        <MapPin class="size-4 shrink-0 opacity-70" />
                        <span class="opacity-90"
                            >{metadata.venue.name}{venueCity ? ` · ${venueCity}` : ''}</span>
                    </div>
                {/if}
            </div>
            <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {#if !data.isPastProgram}
                    <Button href="/register" size="lg" variant="secondary" class="font-semibold">
                        Register Now
                    </Button>
                {/if}
                {#if data.registrantCount > 0}
                    <div class="text-primary-foreground/70 flex items-center gap-1.5 text-sm">
                        <Users class="size-4" />
                        <span>
                            {data.registrantCount}
                            {data.registrantCount === 1 ? 'person' : 'people'} registered
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    </section>

    <!-- Schedule -->
    {#if metadata?.schedule && metadata.schedule.length > 0}
        <section class="col-span-12">
            <ScheduleCard
                schedule={metadata.schedule}
                venueName={metadata.venue?.name}
                startDate={data.event.startDate?.toISOString() ?? undefined} />
        </section>
    {/if}

    <!-- Venue + Food & Drinks -->
    {#if metadata?.venue || hasFood}
        <section class="col-span-12">
            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {#if metadata?.venue}
                    <Card class="h-full">
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2">
                                <MapPin class="size-5" />
                                Venue
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div>
                                <p class="text-xl font-semibold">{metadata.venue.name}</p>
                                {#if metadata.venue.address}
                                    <p class="text-muted-foreground mt-0.5 text-sm">
                                        {metadata.venue.address}
                                    </p>
                                {/if}
                            </div>
                            {#if metadata.venue.description}
                                <p class="text-sm">{metadata.venue.description}</p>
                            {/if}
                            {#if mapsUrl}
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                                    <MapPin class="size-3.5" />
                                    Get directions
                                </a>
                            {/if}
                        </CardContent>
                    </Card>
                {/if}

                {#if hasFood}
                    <Card class="h-full">
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2">
                                <Utensils class="size-5" />
                                Food & Drinks
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-5">
                            {#if metadata?.menu?.length}
                                <div>
                                    <p
                                        class="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
                                        Menu
                                    </p>
                                    <div class="flex flex-wrap gap-2">
                                        {#each metadata.menu as item}
                                            <span class="bg-muted rounded-full px-3 py-1 text-sm"
                                                >{item}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            {#if metadata?.drinks?.length}
                                <div>
                                    <p
                                        class="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
                                        Drinks
                                    </p>
                                    <div class="flex flex-wrap gap-2">
                                        {#each metadata.drinks as item}
                                            <span class="bg-muted rounded-full px-3 py-1 text-sm"
                                                >{item}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </CardContent>
                    </Card>
                {/if}
            </div>
        </section>
    {/if}

    <!-- Map -->
    <section class="col-span-12">
        <LocationMap />
    </section>

    <!-- Things To Do -->
    {#if hasThingsToDo}
        <section class="col-span-12">
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Compass class="size-5" />
                        Things To Do
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {#each metadata?.sites ?? [] as site}
                            <div class="rounded-lg border p-4">
                                <p class="font-medium">{site.name}</p>
                                {#if site.description}
                                    <p class="text-muted-foreground mt-1 text-sm">
                                        {site.description}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                        {#each metadata?.activities ?? [] as activity}
                            <div class="rounded-lg border p-4">
                                <p class="font-medium">{activity.name}</p>
                                {#if activity.description}
                                    <p class="text-muted-foreground mt-1 text-sm">
                                        {activity.description}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </CardContent>
            </Card>
        </section>
    {/if}

    <!-- Stay Connected -->
    <section class="col-span-12">
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <StayConnected />
        </div>
    </section>

    <!-- Bottom CTA -->
    <section class="col-span-12">
        <div class="border-primary/20 bg-primary/5 rounded-2xl border-2 px-6 py-10 text-center">
            <h2>Ready to join the family?</h2>
            <p class="text-muted-foreground mb-6">Secure your spot before registration closes.</p>
            <Button href="/register" size="lg">Register Now</Button>
        </div>
    </section>
{/if}
