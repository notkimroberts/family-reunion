<script lang="ts">
import { Plus, Search, Settings, Users } from '@lucide/svelte'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { AdminDataView } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import * as Table from '$lib/components/ui/table'
import { cn, formatPrice, getPaymentState } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'
import PaymentChannel from './PaymentChannel.svelte'
import RegistrationStatusBadge from './RegistrationStatusBadge.svelte'
import { getRegistrationTotals } from './registrationTotals'

/* One event, two lenses. Bookings is one row per party — who owes what, who to chase. People is one row
   per attendee, which is what catering, shirt counts and the name badges come off: a party of six is one
   booking and six chairs.

   The lens is in the URL so it survives a reload and a trip into a registration and back. It is local to
   this route and means nothing anywhere else — unlike the ?eventId filter it replaces, which meant
   different things on different pages.

   The year picker and the way into Setup live in the status card rather than in a header of their own.
   Which reunion these numbers describe is a property of the numbers; and the app's own nav already
   carries the theme toggle, sign out and the avatar, so an admin header duplicated all three. */

const FILTERS = ['All', 'Paid', 'Pending', 'Waived', 'Refunded'] as const

/* Both pending states are 'pending' in the database and need opposite follow-ups. Telling them apart from
   a list row only became possible once RegistrationSummary.status stopped being a plain `string`. */
const chaseReasonValue = {
    checkout_incomplete: 'Started paying online and stopped — they may think it failed',
    awaiting_payment: 'Entered from a paper form; the money has not arrived',
}

const YES_NO = (value: boolean | null) => (value === null ? '—' : value ? 'Yes' : 'No')

/* Matches the subheadings on the event settings page, so the two admin surfaces read as one design. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'

let { data } = $props()

let totals = $derived(getRegistrationTotals(data.registrations))
let showPeople = $derived(page.url.searchParams.get('view') === 'people')

let search = $state('')
let filter = $state<(typeof FILTERS)[number]>('All')

function setView(next: 'bookings' | 'people') {
    const url = new URL(page.url)
    if (next === 'people') {
        url.searchParams.set('view', 'people')
    } else {
        url.searchParams.delete('view')
    }
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
}

/* Switching year lands on that year's list, dropping the lens and any search: those describe the list you
   were reading, not the year you asked for. */
function handleSelectEvent(nextId: string) {
    goto(`/admin/event/${nextId}/registrations`)
}

function matchesSearch(haystack: string[]): boolean {
    const term = search.trim().toLowerCase()
    return term === '' || haystack.some((value) => value.toLowerCase().includes(term))
}

function chaseReason(registration: (typeof data.registrations)[number]): string | undefined {
    const state = getPaymentState(registration)
    return chaseReasonValue[state as keyof typeof chaseReasonValue]
}

let visibleBookings = $derived(
    data.registrations
        .filter((r) => filter === 'All' || r.status === filter.toLowerCase())
        .filter((r) => matchesSearch([r.contactName, r.contactEmail])),
)

/* People are already paid-or-waived by the query, so the status chips would only ever remove rows and
   never explain why. Search matches the person and whoever registered them — you are as likely to be
   handed "the Pattersons" as a first name. */
let visiblePeople = $derived(
    data.people.filter((person) => matchesSearch([person.name, person.contactName])),
)
</script>

<svelte:head>
    <title>Registrations — Admin</title>
</svelte:head>

<section class="col-span-12 grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
    <!-- Stays on screen while you work the list, rather than being a dashboard you navigate away from. -->
    <aside class="flex flex-col gap-4 self-start rounded-lg border bg-card p-4 lg:sticky lg:top-6">
        <div class="flex flex-col gap-1.5">
            <h1 class="text-base font-semibold">{data.event.title}</h1>
            {#if data.events.length > 1}
                <!-- The year as one quiet control, beside the numbers it changes. It replaces a row of
                     pills that offered "All years" as a peer of a specific year and appeared on five
                     routes but not two others. -->
                <select
                    aria-label="Reunion year"
                    class="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                    value={data.event.id}
                    onchange={(changed) => handleSelectEvent(changed.currentTarget.value)}>
                    {#each data.events as option (option.id)}
                        <option value={option.id}>{option.year}</option>
                    {/each}
                </select>
            {:else}
                <p class="text-muted-foreground text-xs">Reunion year {data.event.year}</p>
            {/if}
        </div>

        <Separator />

        <!-- Two matched groups. The sub-heading carries the qualifier, so the row labels do not have to
             repeat it and the two sets scan as a pair — which is the point: the numbers only make sense
             against each other. Before this the qualifier was invisible and "Parties 4" beside eleven
             bookings read as broken maths. -->
        <div class="flex flex-col gap-3">
            <p class={SUBHEAD_CLASS}>Paid or covered</p>
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">People</span>
                <span class="text-2xl font-bold tabular-nums">{totals.attendingCount}</span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">Parties</span>
                <span class="text-lg font-semibold tabular-nums">{totals.partyCount}</span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">Collected</span>
                <span class="text-lg font-semibold tabular-nums">
                    ${formatPrice(totals.paidCents)}
                </span>
            </div>
        </div>

        <Separator />

        <div class="flex flex-col gap-3">
            <p class={SUBHEAD_CLASS}>Not paid</p>
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">People</span>
                <span class="text-2xl font-bold tabular-nums">{totals.pendingPeopleCount}</span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">Parties</span>
                <span class="text-lg font-semibold tabular-nums">
                    {totals.pendingPartyCount}
                </span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">Outstanding</span>
                <span
                    class={cn(
                        'text-lg font-semibold tabular-nums',
                        totals.outstandingCents > 0 && 'text-amber-700 dark:text-amber-400',
                    )}>
                    ${formatPrice(totals.outstandingCents)}
                </span>
            </div>
            {#if totals.pendingPartyCount > 0}
                <p class="text-muted-foreground text-xs">Each one is marked in the list.</p>
            {/if}
        </div>

        <Separator />

        <div class="flex flex-col gap-2">
            <Button href="/admin/event/{data.event.id}/registrations/new" size="sm">
                <Plus class="size-4" />
                Add paper registration
            </Button>
            <!-- Hidden for anyone who is not the owner. Hiding is not the protection — every Setup load,
                 action and remote function guards itself; this only stops advertising a door that will
                 not open. -->
            {#if data.isOwner}
                <Button href="/admin/setup" variant="ghost" size="sm">
                    <Settings class="size-4" />
                    Setup
                </Button>
            {/if}
        </div>
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <!-- Leftmost, ahead of the search box and the chips, because the lens decides what those two
                 even mean. Two labelled halves rather than a switch: "Show people" as a switch leaves you
                 guessing what the off state shows. -->
            <div class="flex gap-1 rounded-full bg-muted p-1">
                <button
                    type="button"
                    onclick={() => setView('bookings')}
                    aria-pressed={!showPeople}
                    class={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        !showPeople
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
            </div>

            <div class="relative min-w-48 flex-1">
                <Search
                    class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                    bind:value={search}
                    placeholder={showPeople ? 'Search a person or party' : 'Search name or email'}
                    class="pl-8" />
            </div>

            {#if !showPeople}
                <div class="flex flex-wrap gap-1">
                    {#each FILTERS as option (option)}
                        <button
                            type="button"
                            onclick={() => (filter = option)}
                            class={cn(
                                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                                filter === option
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                            )}>
                            {option}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        {#if showPeople}
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
                                {@const born = formatPartialBirthDate(
                                    person.birthYear,
                                    person.birthMonth,
                                    person.birthDay,
                                )}
                                <a
                                    href="/admin/event/{data.event
                                        .id}/registrations/{person.registrationId}"
                                    class="rounded-lg border bg-card p-4 hover:bg-muted">
                                    <div class="flex items-start justify-between gap-2">
                                        <p class="truncate font-medium">{person.name}</p>
                                        <RegistrationStatusBadge status={person.status} />
                                    </div>
                                    <p class="text-muted-foreground mt-0.5 text-xs">
                                        {person.tierLabel}{#if person.shirtSize}
                                            · shirt {person.shirtSize}{/if}{#if born}
                                            · b. {born}{/if}
                                    </p>
                                    <p class="text-muted-foreground mt-1 text-xs">
                                        Vegetarian {YES_NO(person.vegetarianMeal)} · registered by
                                        {person.contactName}
                                    </p>
                                </a>
                            {/each}
                        </div>
                    {/snippet}

                    {#snippet desktopTable()}
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head>Person</Table.Head>
                                    <Table.Head>Tier</Table.Head>
                                    <Table.Head>Shirt</Table.Head>
                                    <Table.Head>Born</Table.Head>
                                    <Table.Head>Vegetarian</Table.Head>
                                    <Table.Head>Came in 2025</Table.Head>
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
                                        <Table.Cell class="text-muted-foreground">
                                            {person.shirtSize ?? '—'}
                                        </Table.Cell>
                                        <Table.Cell class="text-muted-foreground">
                                            {formatPartialBirthDate(
                                                person.birthYear,
                                                person.birthMonth,
                                                person.birthDay,
                                            ) || '—'}
                                        </Table.Cell>
                                        <Table.Cell class="text-muted-foreground">
                                            {YES_NO(person.vegetarianMeal)}
                                        </Table.Cell>
                                        <Table.Cell class="text-muted-foreground">
                                            {YES_NO(person.attendedReunion2025)}
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
                            {@const reason = chaseReason(registration)}
                            <a
                                href="/admin/event/{data.event.id}/registrations/{registration.id}"
                                class={cn(
                                    'rounded-lg border bg-card p-4 hover:bg-muted',
                                    reason && 'border-l-4 border-l-amber-500',
                                )}>
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <p class="truncate font-medium">
                                            {registration.contactName}
                                        </p>
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
                                </p>
                                {#if reason}
                                    <p class="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                                        {reason}
                                    </p>
                                {/if}
                            </a>
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
                                <Table.Head class="text-right">Party</Table.Head>
                                <Table.Head class="text-right">Total</Table.Head>
                                <Table.Head></Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each visibleBookings as registration (registration.id)}
                                {@const reason = chaseReason(registration)}
                                <Table.Row>
                                    <Table.Cell
                                        class={cn(reason && 'border-l-4 border-l-amber-500 pl-3')}>
                                        <p class="font-medium">{registration.contactName}</p>
                                        <p class="text-muted-foreground text-xs">
                                            {registration.contactEmail}
                                        </p>
                                        {#if reason}
                                            <p
                                                class="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                                                {reason}
                                            </p>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <RegistrationStatusBadge status={registration.status} />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <PaymentChannel
                                            stripeSessionId={registration.stripeSessionId} />
                                    </Table.Cell>
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
