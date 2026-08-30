<script lang="ts">
import { ArrowRight, CalendarDays, Plus } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { APP_NAME } from '$lib/general/constants'
import { EVENT_STATUS_STYLES } from '$lib/general/constants/EVENT_STATUS_STYLES'
import type { EventSummary } from '$lib/server/registrations'
import { cn, formatDateRange, formatPrice } from '$lib/utils'

/* The way in: one card per reunion, newest first.

   Beauty from structure rather than decoration — no gradients, no glow. The year is the biggest thing on
   each card because that is what you are choosing between; the money and the head count sit under it in
   the same label-and-figure pairing the registrations sidebar uses, so the two screens read as one app.

   Only one event can be `open` at a time (the one_open_event partial unique index), so exactly one card
   can carry the primary ring. That makes "the one I am working on" findable at a glance without ranking
   the list by anything other than year.

   ADDING A YEAR IS A LINK, not a form that unfolds here. The create panel used to expand between the
   heading and the cards, pushing the list down the screen to show two inputs, and its result came back
   through an $effect that called goto() — a redirect written in three places because the action could
   not simply redirect without stopping a fail() from rendering on this page. /admin/event/new has
   neither problem. */

/* Status shown as a short headline rather than as the full EventStatusBanner: the banner explains a
   consequence at length, which is right above a page you are working on and too much in a list of four.

   Labels, icons and colours come from EVENT_STATUS_STYLES, shared with the settings page. This file used
   to carry its own STATUS_COPY and statusTone(), which is how `closed` ended up grey here and amber in
   the banner. */

let { data } = $props()

function dates(event: EventSummary): string | undefined {
    if (!event.startDate || !event.endDate) {
        return undefined
    }
    return formatDateRange(event.startDate, event.endDate)
}
</script>

<svelte:head>
    <title>Reunions — {APP_NAME}</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div class="flex flex-col gap-2">
            <h1>Reunions</h1>
            <p class="text-muted-foreground text-sm">
                Pick a year to manage its registrations, or see how a past one did.
            </p>
        </div>
        {#if data.isOwner && data.events.length > 0}
            <Button href="/admin/event/new" variant="outline" size="sm">
                <Plus class="size-4" />
                Add new event
            </Button>
        {/if}
    </div>
</section>

{#if data.events.length === 0}
    <section class="col-span-12 xl:col-span-6">
        <div class="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-card p-6">
            <CalendarDays class="text-muted-foreground size-5" />
            <div class="flex flex-col gap-1">
                <p class="font-medium">No reunions yet</p>
                <p class="text-muted-foreground text-sm">
                    Add a year, price its tiers, then open it when registration should start.
                </p>
            </div>
            {#if data.isOwner}
                <Button href="/admin/event/new" size="sm">
                    <Plus class="size-4" />
                    Add the first year
                </Button>
            {/if}
        </div>
    </section>
{:else}
    <section class="col-span-12">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {#each data.events as event (event.id)}
                {@const range = dates(event)}
                {@const status = EVENT_STATUS_STYLES[event.status]}
                {@const StatusIcon = status.icon}
                <!-- The border carries the status, from the same palette as the badge inside the card
                     and as the settings page: green is open and working, sky is a draft, amber is closed,
                     grey is archived. It replaces a primary-coloured ring that marked the open year but
                     said nothing about the other three, so a draft and an archived year looked alike. -->
                <a
                    href="/admin/event/{event.id}/registrations"
                    class={cn(
                        'group flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40',
                        status.border,
                    )}>
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex flex-col gap-0.5">
                            <!-- The year first and largest: it is the thing being chosen between. -->
                            <span class="text-3xl font-bold tabular-nums">{event.year}</span>
                            <span class="text-muted-foreground text-sm">{event.title}</span>
                        </div>
                        <ArrowRight
                            class="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>

                    <div class="flex flex-col gap-0.5">
                        <!-- Icon as well as colour: roughly one man in twelve cannot separate the greens
                             from the ambers, so the shape has to say the same thing. -->
                        <span class="flex items-center gap-1.5 text-xs font-semibold {status.tone}">
                            <StatusIcon class="size-3.5" />
                            {status.headline}
                        </span>
                        {#if range}
                            <span class="text-muted-foreground text-xs">{range}</span>
                        {/if}
                    </div>

                    <!-- Same label-left, figure-right pairing as the registrations sidebar, so the two
                         screens read as one app. -->
                    <div class="flex flex-col gap-1.5 border-t pt-3">
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="text-muted-foreground text-sm">People coming</span>
                            <span class="text-lg font-semibold tabular-nums">
                                {event.attendingPeople}
                            </span>
                        </div>
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="text-muted-foreground text-sm">Collected</span>
                            <span class="text-sm font-semibold tabular-nums">
                                ${formatPrice(event.paidCents)}
                            </span>
                        </div>
                        {#if event.outstandingCents > 0}
                            <div class="flex items-baseline justify-between gap-3">
                                <span class="text-sm text-amber-700 dark:text-amber-400">
                                    Outstanding
                                </span>
                                <span
                                    class="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                                    ${formatPrice(event.outstandingCents)}
                                </span>
                            </div>
                        {/if}
                    </div>

                    {#if event.pendingParties > 0}
                        <p class="text-muted-foreground text-xs">
                            {event.pendingParties}
                            {event.pendingParties === 1 ? 'party' : 'parties'} still to chase
                        </p>
                    {:else if event.attendingParties === 0}
                        <p class="text-muted-foreground text-xs">Nobody has registered yet</p>
                    {:else}
                        <p class="text-muted-foreground text-xs">Everyone has paid</p>
                    {/if}
                </a>
            {/each}
        </div>
    </section>
{/if}
