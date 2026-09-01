<script lang="ts">
import { ClipboardCheck, Gift, Images, Plus, Search, Settings, Users } from '@lucide/svelte'
import { SvelteMap } from 'svelte/reactivity'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { AdminDataView } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import * as Table from '$lib/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip'
import { HOST_HOTEL } from '$lib/general/constants'
import type { EventPerson } from '$lib/server/registrations'
import {
    cn,
    formatPrice,
    formatReunionDateTime,
    formatViewerDateTime,
    type RegistrationStatus,
} from '$lib/utils'
import { formatBirthDate } from '$lib/utils/age'
import HeadcountPanel from './HeadcountPanel.svelte'
import MoneyPanel from './MoneyPanel.svelte'
import OrderSheet from './OrderSheet.svelte'
import PaymentChannel from './PaymentChannel.svelte'
import PaymentNote from './PaymentNote.svelte'
import PersonFieldForm from './PersonFieldForm.svelte'
import PhotoQueue from './PhotoQueue.svelte'
import RegistrationStatusBadge from './RegistrationStatusBadge.svelte'
import { getDonationTotals } from './donationTotals'
import { getEventMoney } from './eventMoney'
import { filterBookings } from './filterBookings'
import { filterDonations } from './filterDonations'
import { filterPeople } from './filterPeople'
import { getPeopleSummary } from './peopleSummary'
import { REGISTRATION_STATUS_STYLES } from './registrationStatusStyles'
import { getRegistrationTotals } from './registrationTotals'
import { lensFromUrl, type RegistrationsLens } from './registrationsViewUrl'
import { getRoomSummary } from './roomSummary'
import { rowAccent } from './rowAccent'
import { urlForLens } from './urlForLens'

/* One event, two lenses. Bookings is one row per party — who owes what, who to chase. People is one row
   per attendee, which is what catering, shirt counts and the name badges come off: a party of six is one
   booking and six chairs.

   The lens is in the URL so it survives a reload and a trip into a registration and back. It is local to
   this route and means nothing anywhere else — unlike the ?eventId filter it replaces, which meant
   different things on different pages.

   The year picker and the way into Setup live in the status card rather than in a header of their own.
   Which reunion these numbers describe is a property of the numbers; and the app's own nav already
   carries the theme toggle, sign out and the avatar, so an admin header duplicated all three. */

/* The filter buttons wear the same badge each status wears in the rows, from the same palette — click the
   green one to see the green ones. `undefined` is the unfiltered chip, because "All" is not a status.

   Colour on every button rather than only the selected one: the row doubles as the legend, so an organiser
   can learn what amber means without hunting for a pending row. The selection is marked by a ring instead,
   which is the only thing that still reads when four buttons are already four different colours.

   Spelled out rather than derived from the style map's keys, because the order is a decision — money in,
   money owed, comped, cancelled — and Object.keys would also widen the union back to string. */
const STATUS_FILTERS: (RegistrationStatus | undefined)[] = [
    undefined,
    'paid',
    'pending',
    'waived',
    'refunded',
]

/* The form value for a nullable yes/no: '' when unanswered, which the select renders as a disabled dash
   and the action reads as "leave this field alone". */
const YES_NO_VALUE = (value: boolean | null) => (value === null ? '' : value ? 'yes' : 'no')

/* Matches the subheadings on the event settings page, so the two admin surfaces read as one design. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'

/* The hotel answer in a table cell. Short, because it shares a row with five other columns — the
   registrant sees the full sentences on the form instead.

   'unasked' is not one of HOTEL_STAY_ANSWERS: it is the null column, meaning the booking predates the
   question, and it must not read as "no" or as a maybe. */
const HOTEL_STAY_LABELS = {
    yes: 'Staying',
    no: 'Elsewhere',
    undecided: 'Not sure',
    unasked: '—',
}

/* Gift states in the organiser's words. "Pending" on a gift means a checkout nobody finished, which
   is not the same thing a pending BOOKING means — hence its own wording rather than the shared
   registration status badge. */
const DONATION_STATUS_LABELS = {
    paid: 'Received',
    pending: 'Not completed',
    refunded: 'Refunded',
}

/* The details an organiser fills in from a phone call or a paper form, editable in place on the
   People lens. Declared once and rendered by both the table and the mobile cards — and the table's
   own headers come off this list too, so the columns cannot end up in a different order from the
   cells beneath them.

   Shirt size offers one list, SHIRT_SIZES, to everyone. The tiers table used to carry an adult/child
   flag alongside it, which no size list ever read; it is gone rather than wired up, because the tier
   LABEL already tells an organiser which shirts a row means and the order sheet groups by it — "Adult:
   S 1 M 3 · Child: S 1 M 1" is a youth count without a youth vocabulary. PersonFieldForm keeps any
   existing value that is not on the list, so nothing already recorded is hidden. */
const PERSON_FIELDS = [
    {
        field: 'shirtSize',
        label: 'Shirt',
        kind: 'shirt',
        value: (person: EventPerson) => person.shirtSize ?? '',
    },
    {
        field: 'birthDate',
        label: 'Born',
        kind: 'date',
        value: (person: EventPerson) =>
            formatBirthDate(person.birthYear, person.birthMonth, person.birthDay) ?? '',
    },
    {
        field: 'vegetarianMeal',
        label: 'Vegetarian',
        kind: 'yesno',
        value: (person: EventPerson) => YES_NO_VALUE(person.vegetarianMeal),
    },
    {
        field: 'attendedReunion2025',
        label: 'Came in 2025',
        kind: 'yesno',
        value: (person: EventPerson) => YES_NO_VALUE(person.attendedReunion2025),
    },
] as const

let { data } = $props()

let totals = $derived(getRegistrationTotals(data.registrations))
let donationTotals = $derived(getDonationTotals(data.donations))
/* Registration money and gift money added into the one figure the panel leads with. See
   eventMoney.ts — the rows it renders beneath that figure have to sum to it. */
let money = $derived(getEventMoney(totals, donationTotals))
/* The order sheet — shirt sizes per tier and the meal split. Derived from the same people the People
   lens lists, and only shown there. */
let summary = $derived(getPeopleSummary(data.people))
/* The room block, off the bookings rather than the people: a household books rooms together. */
let rooms = $derived(getRoomSummary(data.registrations))
/* How many of those people are actually here, off the same rows the People lens lists. Counted here
   rather than in getRegistrationTotals: that derives from bookings, and its figures are pinned by the
   money identity — an arrival belongs to neither side of it. */
let arrivedCount = $derived(data.people.filter((person) => person.checkedInAt !== null).length)
let lens = $derived(lensFromUrl(page.url))
let showPeople = $derived(lens === 'people')
let showDonations = $derived(lens === 'donations')
let showPhotos = $derived(lens === 'photos')

let search = $state('')
/* undefined is unfiltered. Holding the database's own value rather than a display label also retires the
   `filter.toLowerCase()` the comparison used to need. */
let statusFilter = $state<RegistrationStatus | undefined>(undefined)

function setView(next: RegistrationsLens) {
    goto(urlForLens(page.url, next), { replaceState: true, keepFocus: true, noScroll: true })
}

/* Which rows each lens shows is decided in filterBookings / filterPeople rather than inline here. The
   two rules genuinely differ — Bookings honours the status chips, People deliberately ignores them —
   and a rule that exists only inside a $derived cannot be tested in a project with no component
   harness. The coloured left edge lives in rowAccent.ts for the same reason: refunded silently had
   none until it was extracted and every state had to be decided. */
let visibleBookings = $derived(filterBookings(data.registrations, { search, status: statusFilter }))
let visiblePeople = $derived(filterPeople(data.people, { search }))
let visibleDonations = $derived(filterDonations(data.donations, { search }))

/* Payment dates in the READER's timezone, filled in after mount.

   NOT a $derived, though it looks like one: $derived is evaluated during SSR too, and with no timeZone
   option Intl resolves to the server's zone — UTC on Railway. Svelte does not recompute template text on
   hydration, so a server-rendered time simply stays wrong. A payment at 23:30 Pacific is the next DAY in
   UTC, so this is a wrong-date bug, not a wrong-clock one. Same shape and same reason as
   RegistrationHistory. */
let paidLabels = new SvelteMap<string, string>()
/* Gift dates, in the reader's zone, for exactly the reason above. */
let giftLabels = new SvelteMap<string, string>()

$effect(() => {
    for (const registration of data.registrations) {
        if (registration.paidAt) {
            paidLabels.set(registration.id, formatViewerDateTime(registration.paidAt))
        }
    }
})

$effect(() => {
    for (const donation of data.donations) {
        if (donation.paidAt) {
            giftLabels.set(donation.id, formatViewerDateTime(donation.paidAt))
        }
    }
})
</script>

<svelte:head>
    <title>Registrations — Admin</title>
</svelte:head>

<section class="col-span-12 grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
    <!-- Stays on screen while you work the list, rather than being a dashboard you navigate away from. -->
    <aside class="bg-card flex flex-col gap-4 self-start rounded-lg border p-4 lg:sticky lg:top-6">
        <!-- No year picker. Switching years is what /admin is for — it lists every reunion with its
             numbers on it, which is more use for choosing between them than a select showing only
             years. The picker also had to be hidden when there was one event, so it was a control that
             sometimes existed. -->
        <div class="flex items-start justify-between gap-2">
            <div class="flex flex-col gap-1.5">
                <h1 class="text-base font-semibold">{data.event.title}</h1>
                <p class="text-muted-foreground text-xs">Reunion year {data.event.year}</p>
            </div>
            <!-- Top-right, as an icon: it is the only thing on this card that leaves the page, and it
                 is not what the card is for. Hidden for anyone who is not the owner — hiding is not the
                 protection, the settings route guards its own load and every action; this only stops
                 advertising a door that will not open. -->
            {#if data.isOwner}
                <Tooltip>
                    <TooltipTrigger>
                        {#snippet child({ props })}
                            <Button
                                {...props}
                                href="/admin/event/{data.event.id}/settings"
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

        <!-- The way to the door. A full-width button rather than the icon Settings uses: on the day this
             is the most-used link in the admin area, and it is found on a phone in a hall. -->
        <Button href="/admin/event/{data.event.id}/checkin" variant="outline" class="w-full">
            <ClipboardCheck class="size-4" />
            Check in arrivals
        </Button>

        <Separator />

        <HeadcountPanel {totals} {arrivedCount} />

        <Separator />

        <OrderSheet {summary} attendingCount={totals.attendingCount} {rooms} />
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <!-- Leftmost, ahead of the search box and the chips, because the lens decides what those two
                 even mean. Two labelled halves rather than a switch: "Show people" as a switch leaves you
                 guessing what the off state shows. -->
            <div class="bg-muted flex gap-1 rounded-full p-1">
                <button
                    type="button"
                    onclick={() => setView('bookings')}
                    aria-pressed={lens === 'bookings'}
                    class={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        lens === 'bookings'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground',
                    )}>
                    Bookings
                </button>
                <button
                    type="button"
                    onclick={() => setView('people')}
                    aria-pressed={showPeople}
                    class={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        showPeople
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground',
                    )}>
                    <Users class="size-3.5" />
                    People
                </button>
                <!-- Gifts is a third lens rather than a page of its own, for the reason People is:
                     it is the same year's money, read a different way. -->
                <button
                    type="button"
                    onclick={() => setView('donations')}
                    aria-pressed={showDonations}
                    class={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        showDonations
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground',
                    )}>
                    <Gift class="size-3.5" />
                    Gifts
                </button>
                <!-- Photos is the moderation queue, not a year's photos: contributed rows carry a
                     nullable event_id and the recovered archive has none, so there is one queue. -->
                <button
                    type="button"
                    onclick={() => setView('photos')}
                    aria-pressed={showPhotos}
                    class={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        showPhotos
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground',
                    )}>
                    <Images class="size-3.5" />
                    Photos
                    {#if data.pendingPhotos.length > 0}
                        <span
                            class="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] leading-4">
                            {data.pendingPhotos.length}
                        </span>
                    {/if}
                </button>
            </div>

            <div class="relative min-w-48 flex-1">
                <Search
                    class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                    bind:value={search}
                    placeholder={showDonations
                        ? 'Search a donor'
                        : showPeople
                          ? 'Search a person or party'
                          : 'Search name or email'}
                    class="pl-8" />
            </div>

            {#if lens === 'bookings'}
                <div class="flex flex-wrap gap-1.5">
                    {#each STATUS_FILTERS as status (status ?? 'all')}
                        {@const style = status ? REGISTRATION_STATUS_STYLES[status] : undefined}
                        {@const Icon = style?.icon}
                        {@const selected = statusFilter === status}
                        <button
                            type="button"
                            onclick={() => (statusFilter = status)}
                            aria-pressed={selected}
                            class={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-all',
                                /* Same border/background/text triple the row badge wears, so the chip and
                                   the rows it selects are visibly the same thing. */
                                style?.class ?? 'text-muted-foreground bg-muted border-transparent',
                                /* Selection is a ring, not a colour change — four buttons are already
                                   four colours, so there is no colour left to mean "chosen". */
                                selected
                                    ? 'ring-ring ring-offset-background ring-2 ring-offset-1'
                                    : 'opacity-70 hover:opacity-100',
                            )}>
                            {#if Icon}
                                <Icon class="size-3" />
                            {/if}
                            {style?.label ?? 'All'}
                        </button>
                    {/each}
                </div>
            {/if}

            <!-- Paper entry sits at the end of the control row rather than in the sidebar, so the one
                 thing here that CREATES a booking is beside the controls that filter them instead of
                 under a column of totals it has nothing to do with.

                 ml-auto so it holds the right edge whatever is to its left: the status chips are absent
                 on the People lens, and without it the button would slide left and change place between
                 the two views. The separator is what stops it reading as a fifth filter — it is the only
                 control in the row that navigates. -->
            <div class="ml-auto flex items-center gap-2">
                <Separator orientation="vertical" class="hidden h-6 sm:block" />
                <Button href="/admin/event/{data.event.id}/registrations/new" size="sm">
                    <Plus class="size-4" />
                    Add paper registration
                </Button>
            </div>
        </div>

        {#if showPhotos}
            <p class="text-muted-foreground text-xs">
                Photos contributed by the family, waiting on a decision. Nothing here is publicly
                visible until it is approved.
            </p>
            <PhotoQueue photos={data.pendingPhotos} />
        {:else if showDonations}
            <p class="text-muted-foreground text-xs">
                Every gift recorded for this year, including the checkouts nobody finished. {data
                    .donations.length}
                {data.donations.length === 1 ? 'gift' : 'gifts'}.
            </p>

            {#if data.donations.length === 0}
                <p class="text-muted-foreground text-sm">No gifts for this year yet.</p>
            {:else if visibleDonations.length === 0}
                <p class="text-muted-foreground text-sm">Nothing matches that.</p>
            {:else}
                <AdminDataView>
                    {#snippet mobileCards()}
                        <div class="flex flex-col gap-3">
                            {#each visibleDonations as donation (donation.id)}
                                <div class="bg-card flex flex-col gap-2 rounded-lg border p-4">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <p class="truncate font-medium">{donation.donorName}</p>
                                            <p
                                                class="text-muted-foreground mt-0.5 truncate text-xs">
                                                {donation.donorEmail}
                                            </p>
                                        </div>
                                        <span class="font-semibold tabular-nums">
                                            ${formatPrice(donation.amountCents)}
                                        </span>
                                    </div>
                                    <p class="text-muted-foreground text-xs">
                                        {DONATION_STATUS_LABELS[donation.status]}
                                        {#if giftLabels.get(donation.id)}
                                            · {giftLabels.get(donation.id)}
                                        {/if}
                                    </p>
                                    {#if donation.message}
                                        <p class="text-sm italic">“{donation.message}”</p>
                                    {/if}
                                    {#if donation.registrationId}
                                        <a
                                            href="/admin/event/{data.event
                                                .id}/registrations/{donation.registrationId}"
                                            class="text-muted-foreground hover:text-foreground text-xs">
                                            Given with a registration →
                                        </a>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/snippet}

                    {#snippet desktopTable()}
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head>Donor</Table.Head>
                                    <Table.Head>Status</Table.Head>
                                    <Table.Head>Given</Table.Head>
                                    <Table.Head>Message</Table.Head>
                                    <Table.Head class="text-right">Amount</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each visibleDonations as donation (donation.id)}
                                    <Table.Row>
                                        <Table.Cell>
                                            <p class="font-medium">{donation.donorName}</p>
                                            <p class="text-muted-foreground text-xs">
                                                {donation.donorEmail}
                                            </p>
                                        </Table.Cell>
                                        <Table.Cell class="text-muted-foreground text-sm">
                                            {DONATION_STATUS_LABELS[donation.status]}
                                        </Table.Cell>
                                        <Table.Cell class="text-muted-foreground text-sm">
                                            {giftLabels.get(donation.id) ?? '—'}
                                            {#if donation.registrationId}
                                                <a
                                                    href="/admin/event/{data.event
                                                        .id}/registrations/{donation.registrationId}"
                                                    class="block text-xs hover:underline">
                                                    with a registration
                                                </a>
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell class="text-muted-foreground max-w-xs text-sm">
                                            {donation.message ?? '—'}
                                        </Table.Cell>
                                        <Table.Cell class="text-right tabular-nums">
                                            ${formatPrice(donation.amountCents)}
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    {/snippet}
                </AdminDataView>
            {/if}
        {:else if showPeople}
            <p class="text-muted-foreground text-xs">
                Everyone with a place — paid or covered. {data.people.length}
                {data.people.length === 1 ? 'person' : 'people'}. Unpaid parties are in Bookings.
            </p>

            {#if data.people.length === 0}
                <p class="text-muted-foreground text-sm">Nobody has a place for this year yet.</p>
            {:else if visiblePeople.length === 0}
                <p class="text-muted-foreground text-sm">Nothing matches that.</p>
            {:else}
                <AdminDataView>
                    {#snippet mobileCards()}
                        <div class="flex flex-col gap-3">
                            {#each visiblePeople as person (person.id)}
                                <div class="bg-card flex flex-col gap-3 rounded-lg border p-4">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <p class="truncate font-medium">{person.name}</p>
                                            <!-- Tier only. The shirt size used to sit here as text and
                                                 is now one of the editable rows below, so repeating it
                                                 would give the same value two places to disagree. -->
                                            <p class="text-muted-foreground mt-0.5 text-xs">
                                                {person.tierLabel}
                                            </p>
                                        </div>
                                        <RegistrationStatusBadge status={person.status} />
                                    </div>

                                    <!-- The same three editable fields as the table, stacked. The card is
                                         no longer a link: it holds controls now, and a tap that both
                                         opens a select and navigates is neither. -->
                                    <div class="grid grid-cols-[7rem_1fr] items-center gap-2">
                                        {#each PERSON_FIELDS as field (field.field)}
                                            <span class="text-muted-foreground text-sm">
                                                {field.label}
                                            </span>
                                            <PersonFieldForm
                                                memberId={person.id}
                                                personName={person.name}
                                                field={field.field}
                                                label={field.label}
                                                kind={field.kind}
                                                value={field.value(person)} />
                                        {/each}
                                    </div>

                                    {#if person.checkedInAt}
                                        <p class="text-muted-foreground text-xs">
                                            Arrived {formatReunionDateTime(
                                                person.checkedInAt,
                                                'time',
                                            )}
                                        </p>
                                    {/if}

                                    <a
                                        href="/admin/event/{data.event
                                            .id}/registrations/{person.registrationId}"
                                        class="text-muted-foreground hover:text-foreground text-xs">
                                        Registered by {person.contactName} →
                                    </a>
                                </div>
                            {/each}
                        </div>
                    {/snippet}

                    {#snippet desktopTable()}
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head>Person</Table.Head>
                                    <Table.Head>Registration Tier</Table.Head>
                                    <!-- Off PERSON_FIELDS, so a column cannot end up labelling the
                                         wrong control. -->
                                    {#each PERSON_FIELDS as field (field.field)}
                                        <Table.Head>{field.label}</Table.Head>
                                    {/each}
                                    <Table.Head>Arrived</Table.Head>
                                    <Table.Head>Registered by</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each visiblePeople as person (person.id)}
                                    <Table.Row>
                                        <Table.Cell class="font-medium">{person.name}</Table.Cell>
                                        <Table.Cell class="text-muted-foreground">
                                            {person.tierLabel}
                                        </Table.Cell>
                                        <!-- Editable in place. Each cell owns its own form — see
                                             PersonFieldForm for why one per cell rather than one per
                                             row. -->
                                        {#each PERSON_FIELDS as field (field.field)}
                                            <Table.Cell class="w-36">
                                                <PersonFieldForm
                                                    memberId={person.id}
                                                    personName={person.name}
                                                    field={field.field}
                                                    label={field.label}
                                                    kind={field.kind}
                                                    value={field.value(person)} />
                                            </Table.Cell>
                                        {/each}
                                        <!-- Read-only here. The tick belongs at the door, on the
                                             check-in page; this column is so an organiser reconciling
                                             the day can see it beside the shirt and meal answers. -->
                                        <Table.Cell class="text-muted-foreground text-sm">
                                            {person.checkedInAt
                                                ? formatReunionDateTime(person.checkedInAt, 'time')
                                                : '—'}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <a
                                                href="/admin/event/{data.event
                                                    .id}/registrations/{person.registrationId}"
                                                class="text-sm hover:underline">
                                                {person.contactName}
                                            </a>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    {/snippet}
                </AdminDataView>
            {/if}
        {:else if data.registrations.length === 0}
            <p class="text-muted-foreground text-sm">
                Nobody has registered for this year yet. Paper forms can be entered with the button
                on the left.
            </p>
        {:else if visibleBookings.length === 0}
            <p class="text-muted-foreground text-sm">Nothing matches that.</p>
        {:else}
            <AdminDataView>
                {#snippet mobileCards()}
                    <div class="flex flex-col gap-3">
                        {#each visibleBookings as registration (registration.id)}
                            <!-- Not a link, though it was one. PaymentNote now renders a "View in
                                 Stripe" anchor, and an <a> inside an <a> is invalid HTML: the browser
                                 hoists the inner one out during parsing, the hydrated tree no longer
                                 matches the server's, and Svelte throws — which took down the whole
                                 page, desktop included, because BOTH branches of AdminDataView are in
                                 the DOM at every width and only one of them is display:none. The name
                                 carries the link instead, the same shape the People card uses. -->
                            <div
                                class={cn(
                                    'bg-card rounded-lg border p-4',
                                    rowAccent(registration),
                                )}>
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <a
                                            href="/admin/event/{data.event
                                                .id}/registrations/{registration.id}"
                                            class="block truncate font-medium hover:underline">
                                            {registration.contactName}
                                        </a>
                                        <p class="text-muted-foreground mt-0.5 truncate text-xs">
                                            {registration.contactEmail}
                                        </p>
                                    </div>
                                    <RegistrationStatusBadge status={registration.status} />
                                </div>
                                <p
                                    class="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                                    <span>
                                        {registration.memberCount}
                                        {registration.memberCount === 1 ? 'person' : 'people'} · ${formatPrice(
                                            registration.totalCents,
                                        )}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <PaymentChannel
                                        stripeSessionId={registration.stripeSessionId} />
                                    {#if HOST_HOTEL}
                                        <span aria-hidden="true">·</span>
                                        <span>
                                            Hotel: {HOTEL_STAY_LABELS[
                                                registration.stayingAtHostHotel ?? 'unasked'
                                            ]}
                                        </span>
                                    {/if}
                                </p>
                                <div class="mt-1.5">
                                    <PaymentNote
                                        {registration}
                                        stripeTestMode={data.stripeTestMode}
                                        paidLabel={paidLabels.get(registration.id)} />
                                </div>
                                <div class="mt-3">
                                    <Button
                                        href="/admin/event/{data.event
                                            .id}/registrations/{registration.id}"
                                        variant="outline"
                                        size="sm"
                                        class="w-full">
                                        Manage
                                    </Button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/snippet}

                {#snippet desktopTable()}
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>Contact</Table.Head>
                                <Table.Head>Status</Table.Head>
                                <Table.Head>Came in via</Table.Head>
                                {#if HOST_HOTEL}
                                    <Table.Head>Hotel</Table.Head>
                                {/if}
                                <Table.Head class="text-right">Party</Table.Head>
                                <Table.Head class="text-right">Total</Table.Head>
                                <Table.Head></Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each visibleBookings as registration (registration.id)}
                                <Table.Row>
                                    <Table.Cell class={rowAccent(registration)}>
                                        <p class="font-medium">{registration.contactName}</p>
                                        <p class="text-muted-foreground text-xs">
                                            {registration.contactEmail}
                                        </p>
                                        <div class="mt-0.5">
                                            <PaymentNote
                                                {registration}
                                                stripeTestMode={data.stripeTestMode}
                                                paidLabel={paidLabels.get(registration.id)} />
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <RegistrationStatusBadge status={registration.status} />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <PaymentChannel
                                            stripeSessionId={registration.stripeSessionId} />
                                    </Table.Cell>
                                    {#if HOST_HOTEL}
                                        <Table.Cell class="text-muted-foreground text-sm">
                                            {HOTEL_STAY_LABELS[
                                                registration.stayingAtHostHotel ?? 'unasked'
                                            ]}
                                        </Table.Cell>
                                    {/if}
                                    <Table.Cell class="text-right tabular-nums">
                                        {registration.memberCount}
                                    </Table.Cell>
                                    <Table.Cell class="text-right tabular-nums">
                                        ${formatPrice(registration.totalCents)}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <Button
                                            href="/admin/event/{data.event
                                                .id}/registrations/{registration.id}"
                                            variant="outline"
                                            size="sm">
                                            Manage
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                {/snippet}
            </AdminDataView>
        {/if}
    </div>
</section>
