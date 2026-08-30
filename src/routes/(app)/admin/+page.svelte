<script lang="ts">
import { ArrowRight, CalendarDays, Plus } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { goto } from '$app/navigation'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
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
   the list by anything other than year. */

/* Status shown as a short headline rather than as the full EventStatusBanner: the banner explains a
   consequence at length, which is right above a page you are working on and too much in a list of four.

   Labels, icons and colours come from EVENT_STATUS_STYLES, shared with the settings page. This file used
   to carry its own STATUS_COPY and statusTone(), which is how `closed` ended up grey here and amber in
   the banner. */

let { data, form } = $props()

/* Open only when asked for. A create form permanently expanded above the list would put a
   once-a-year action ahead of the one every visit is for, which is picking a year. */
let adding = $state(false)

/* A new year lands on its own settings page rather than back on the list: it is created in 'draft'
   with $0 tiers, so it cannot take a registration until it is priced, and the list would not say so.
   Driven off the action's result rather than a redirect in the action, so a fail() can still render
   its message on this page. */
$effect(() => {
    if (form?.createdEventId) {
        adding = false
        goto(`/admin/event/${form.createdEventId}/settings`)
    }
})

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
        {#if data.isOwner && !adding && data.events.length > 0}
            <Button variant="outline" size="sm" onclick={() => (adding = true)}>
                <Plus class="size-4" />
                Add new event
            </Button>
        {/if}
    </div>

    {#if adding}
        <div class="flex flex-col gap-4 rounded-xl border bg-card p-5">
            <div class="flex flex-col gap-1">
                <p class="font-medium">Add a reunion year</p>
                <!-- Says what happens next, because "draft" and "$0 tiers" are the two facts that
                     decide whether the year is usable, and neither is visible from the list. -->
                <p class="text-muted-foreground text-sm">
                    It starts as a draft with Adult and Child tiers at $0, so nobody can register
                    until you price them and open it.
                </p>
            </div>

            {#if form?.createError}
                <Alert variant="destructive">
                    <AlertDescription>{form.createError}</AlertDescription>
                </Alert>
            {/if}

            <form
                method="POST"
                action="?/create_event"
                use:enhance
                class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                <Field.Field class="gap-2">
                    <Field.Label for="new-event-title">Title</Field.Label>
                    <Input
                        id="new-event-title"
                        name="title"
                        type="text"
                        placeholder="Patterson Family Reunion"
                        required />
                </Field.Field>
                <Field.Field class="gap-2">
                    <Field.Label for="new-event-year">Year</Field.Label>
                    <Input id="new-event-year" name="year" type="number" required />
                </Field.Field>
                <div class="flex gap-2">
                    <Button type="submit" size="sm" class="w-full sm:w-auto">Create</Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onclick={() => (adding = false)}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    {/if}
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
                <Button size="sm" onclick={() => (adding = true)}>
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
