<script lang="ts">
import { ChevronDown, ClipboardCheck, Settings } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Separator } from '$lib/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip'
import type { DonationSummary } from '$lib/server/donations'
import type { EventPerson, RegistrationSummary } from '$lib/server/registrations'
import { cn } from '$lib/utils'
import HeadcountPanel from './HeadcountPanel.svelte'
import MoneyPanel from './MoneyPanel.svelte'
import OrderSheet from './OrderSheet.svelte'
import { getDonationTotals } from './donationTotals'
import { getEventMoney } from './eventMoney'
import { getPeopleSummary } from './peopleSummary'
import { getRegistrationTotals } from './registrationTotals'
import { getRoomSummary } from './roomSummary'

type Props = {
    event: { id: string; title: string; year: number }
    isOwner: boolean
    registrations: RegistrationSummary[]
    people: EventPerson[]
    donations: DonationSummary[]
    /* h1 on the list, where the event is the page's subject; h2 on a booking, whose h1 is the
       registrant's name. */
    headingTag?: 'h1' | 'h2'
}

let { event, isOwner, registrations, people, donations, headingTag = 'h1' }: Props = $props()

let totals = $derived(getRegistrationTotals(registrations))
/* Registration money and gift money added into the one figure the panel leads with. See
   eventMoney.ts — the rows it renders beneath that figure have to sum to it. */
let money = $derived(getEventMoney(totals, getDonationTotals(donations)))
/* The order sheet — shirt sizes per tier and the meal split. */
let summary = $derived(getPeopleSummary(people))
/* The room block, off the bookings rather than the people: a household books rooms together. */
let rooms = $derived(getRoomSummary(registrations))
/* Counted here rather than in getRegistrationTotals: that derives from bookings, and its figures are
   pinned by the money identity — an arrival belongs to neither side of it. */
let arrivedCount = $derived(people.filter((person) => person.checkedInAt !== null).length)
/* Below lg the panel stacks ABOVE the list, and opened in full it was a screen and a half of scrolling
   before the first booking. Money and the check-in link stay; the rest waits behind a tap. Ignored at
   lg, where the panel is a sidebar and always open. */
let showDetails = $state(false)

function handleToggleDetails() {
    showDetails = !showDetails
}
</script>

<!-- Stays on screen while you work the list or a booking, rather than being a dashboard you navigate
     away from. -->
<aside class="bg-card flex flex-col gap-4 self-start rounded-lg border p-4 lg:sticky lg:top-6">
    <!-- No year picker. Switching years is what /admin is for — it lists every reunion with its
         numbers on it, which is more use for choosing between them than a select showing only years. -->
    <div class="flex items-start justify-between gap-2">
        <div class="flex flex-col gap-1.5">
            <svelte:element this={headingTag} class="text-base font-semibold">
                {event.title}
            </svelte:element>
            <p class="text-muted-foreground text-xs">Reunion year {event.year}</p>
        </div>
        <!-- Hidden for anyone who is not the owner — hiding is not the protection, the settings route
             guards its own load and every action; this only stops advertising a door that will not
             open. -->
        {#if isOwner}
            <Tooltip>
                <TooltipTrigger>
                    {#snippet child({ props })}
                        <Button
                            {...props}
                            href="/admin/event/{event.id}/settings"
                            variant="ghost"
                            size="icon"
                            class="size-8 shrink-0">
                            <Settings class="size-4" />
                            <span class="sr-only">Event settings</span>
                        </Button>
                    {/snippet}
                </TooltipTrigger>
                <TooltipContent>Event settings</TooltipContent>
            </Tooltip>
        {/if}
    </div>

    <Separator />

    <MoneyPanel {money} />

    <Separator />

    <!-- A full-width button rather than the icon Settings uses: on the day this is the most-used link
         in the admin area, and it is found on a phone in a hall. -->
    <Button href="/admin/event/{event.id}/checkin" variant="outline" class="w-full">
        <ClipboardCheck class="size-4" />
        Check in arrivals
    </Button>

    <Button
        type="button"
        variant="ghost"
        size="sm"
        class="text-muted-foreground lg:hidden"
        aria-expanded={showDetails}
        onclick={handleToggleDetails}>
        {totals.attendingCount} coming · {showDetails ? 'Hide' : 'Show'} people and orders
        <ChevronDown class={cn('size-4 transition-transform', showDetails && 'rotate-180')} />
    </Button>

    <div class={cn('flex-col gap-4 lg:flex', showDetails ? 'flex' : 'hidden')}>
        <Separator />

        <HeadcountPanel {totals} {arrivedCount} />

        <Separator />

        <OrderSheet {summary} attendingCount={totals.attendingCount} {rooms} />
    </div>
</aside>
