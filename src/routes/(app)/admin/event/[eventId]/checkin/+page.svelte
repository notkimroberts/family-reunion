<script lang="ts">
import { ArrowLeft, Plus, Search } from '@lucide/svelte'
import { toast } from 'svelte-sonner'
import { SvelteMap, SvelteSet } from 'svelte/reactivity'
import { invalidateAll } from '$app/navigation'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import { matchesSearch } from '$lib/general/search'
import type { EventPerson } from '$lib/server/registrations'
import type { PageData } from './$types'
import CheckinGroupCard from './CheckinGroup.svelte'
import UnlistedMatches from './UnlistedMatches.svelte'
import { findUnlisted } from './findUnlisted.remote'
import { groupPeopleByBooking, type CheckinGroup } from './groupPeopleByBooking'
import { setCheckedIn } from './setCheckedIn.remote'
import { setShirtHandedOver } from './setShirtHandedOver.remote'

/* The door. One job: record who arrived, from a phone, with a queue waiting.

   No money anywhere on this page — see +page.server.ts for why — and no way to create a registration:
   a walk-up goes through paper entry, which already owns tier resolution and payment channels. */

let { data }: { data: PageData } = $props()

let search = $state('')

/* Arrivals ticked in this session, keyed by member id. An OVERLAY on the loaded rows rather than a mutable
   copy of them: a copy would either be re-initialised on every reload — throwing away a tick that was
   already saved — or drift from the server permanently. */
const overrides = new SvelteMap<string, Date | null>()

/* The same overlay for shirts, kept apart from arrivals: the two are separate columns and separate taps,
   and one map keyed by member id could only hold whichever was tapped last. */
const shirtOverrides = new SvelteMap<string, Date | null>()

/* Ids with a request in flight, so the row can dim without blocking the next tap. */
const inFlight = new SvelteSet<string>()
const shirtInFlight = new SvelteSet<string>()

/* Groups the greeter has opened by hand. A search overrides this, expanding whatever it matched. */
const openGroups = new SvelteSet<string>()

const arrivedAt = (person: EventPerson) =>
    overrides.has(person.id) ? (overrides.get(person.id) ?? null) : person.checkedInAt

const shirtGivenAt = (person: EventPerson) =>
    shirtOverrides.has(person.id) ? (shirtOverrides.get(person.id) ?? null) : person.shirtGivenAt

const people = $derived(
    data.people.map((person) => ({
        ...person,
        checkedInAt: arrivedAt(person),
        shirtGivenAt: shirtGivenAt(person),
    })),
)

const arrivedCount = $derived(people.filter((person) => person.checkedInAt !== null).length)

const shirtsGivenCount = $derived(people.filter((person) => person.shirtGivenAt !== null).length)

/* People who are HERE and have no size on file — the ones an organiser has to ask before the box is
   empty. Counted on arrivals only: a missing size for somebody who never turns up is not a job. */
const missingSizeHere = $derived(
    people.filter((person) => person.checkedInAt !== null && !person.shirtSize).length,
)

/* A search matches PEOPLE, but it shows whole BOOKINGS.

   matchesSearch is the People lens's own predicate, imported rather than rewritten: it matches the
   attendee AND whoever booked them, which is what makes "the Pattersons" a usable search.

   The booking is then shown intact, not narrowed to the row that matched. Searching a child's first
   name finds the one person, and the four relatives who arrived in the same car are the next four taps
   — narrowing to the match would send the greeter back to the box to search the contact's name instead,
   which they can only do if they know it. */
const matchedBookingIds = $derived(
    new Set(
        people
            .filter((person) => matchesSearch(search, [person.name, person.contactName]))
            .map((person) => person.registrationId),
    ),
)

const groups = $derived(
    groupPeopleByBooking(people.filter((person) => matchedBookingIds.has(person.registrationId))),
)

const searching = $derived(search.trim().length > 0)

function isExpanded(group: CheckinGroup): boolean {
    return searching || openGroups.has(group.registrationId)
}

function handleToggleExpanded(registrationId: string) {
    if (openGroups.has(registrationId)) {
        openGroups.delete(registrationId)
    } else {
        openGroups.add(registrationId)
    }
}

/* Optimistic, deliberately. A greeter who waits for a round trip on venue wifi taps again — and with a
   toggle, the second tap un-checks the person they just checked in. So the tick lands immediately and is
   reverted only if the server refuses. */
async function apply(person: EventPerson, checkedIn: boolean) {
    const previous = arrivedAt(person)
    overrides.set(person.id, checkedIn ? new Date() : null)
    inFlight.add(person.id)

    try {
        const result = await setCheckedIn({
            memberId: person.id,
            eventId: data.event.id,
            checkedIn,
        })
        overrides.set(person.id, result.checkedInAt)
    } catch {
        overrides.set(person.id, previous)
        toast.error(`Could not ${checkedIn ? 'check in' : 'undo'} ${person.name}. Try again.`)
    } finally {
        inFlight.delete(person.id)
    }
}

function handleToggle(person: EventPerson) {
    void apply(person, arrivedAt(person) === null)
}

/* Same optimistic shape as the arrival, against the other column. Not folded into `apply` with a flag:
   the two write different columns through different remote functions, and a shared body would be a
   branch on every line of it. */
async function applyShirt(person: EventPerson, given: boolean) {
    const previous = shirtGivenAt(person)
    shirtOverrides.set(person.id, given ? new Date() : null)
    shirtInFlight.add(person.id)

    try {
        const result = await setShirtHandedOver({
            memberId: person.id,
            eventId: data.event.id,
            given,
        })
        shirtOverrides.set(person.id, result.shirtGivenAt)
    } catch {
        shirtOverrides.set(person.id, previous)
        toast.error(`Could not record the shirt for ${person.name}. Try again.`)
    } finally {
        shirtInFlight.delete(person.id)
    }
}

function handleToggleShirt(person: EventPerson) {
    void applyShirt(person, shirtGivenAt(person) === null)
}

/* One tap for the family that walked in together. Only the not-yet-arrived members are written, so it
   cannot undo an arrival another greeter recorded at the other door. */
function handleToggleParty(group: CheckinGroup) {
    group.members
        .filter((member) => arrivedAt(member) === null)
        .forEach((member) => void apply(member, true))
}

/* On focus, not on a timer. The realistic staleness is a phone put down for ten minutes while the other
   door ticked people in; a five-second poll on venue wifi is a battery drain and an error-toast machine. */
function handleFocus() {
    void invalidateAll()
}
</script>

<svelte:window onfocus={handleFocus} />

<section class="col-span-12 flex flex-col gap-4 xl:col-span-8">
    <div class="flex flex-col gap-1">
        <a
            href="/admin/event/{data.event.id}/registrations"
            class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs">
            <ArrowLeft class="size-3.5" />
            Back to registrations
        </a>
        <h1 class="text-base font-semibold">Check in · {data.event.title}</h1>
        <p class="text-muted-foreground text-sm">
            <span class="text-foreground text-lg font-bold tabular-nums">{arrivedCount}</span>
            of {data.people.length} arrived
            <!-- Shirts beside arrivals rather than under them: at the door they are one job, and the gap
                 between the two numbers IS the queue still waiting for a shirt. -->
            · <span class="text-foreground font-semibold tabular-nums">{shirtsGivenCount}</span>
            {shirtsGivenCount === 1 ? 'shirt' : 'shirts'} given
        </p>

        <!-- The chase list, stated as a number rather than left for the organiser to spot chip by chip
             down a long list. -->
        {#if missingSizeHere > 0}
            <p class="text-destructive text-xs">
                {missingSizeHere}
                {missingSizeHere === 1 ? 'person here has' : 'people here have'} no shirt size on file
            </p>
        {/if}
    </div>

    <!-- Sticky, because the list is long and the next name is always a search away. -->
    <div class="bg-background sticky top-0 z-10 flex items-center gap-2 py-2">
        <div class="relative flex-1">
            <Search
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
                bind:value={search}
                type="search"
                placeholder="Search a name or the family who booked"
                class="pl-9" />
        </div>
        <Button href="/admin/event/{data.event.id}/registrations/new" variant="outline" size="icon">
            <Plus class="size-4" />
            <span class="sr-only">Add a walk-up registration</span>
        </Button>
    </div>

    <div class="flex flex-col gap-2">
        {#each groups as group (group.registrationId)}
            <CheckinGroupCard
                {group}
                expanded={isExpanded(group)}
                pendingIds={inFlight}
                shirtPendingIds={shirtInFlight}
                onToggleExpanded={handleToggleExpanded}
                onToggle={handleToggle}
                onToggleParty={handleToggleParty}
                onToggleShirt={handleToggleShirt} />
        {/each}

        {#if searching}
            <!-- Only ever asked for once there is something to search on, and only rendered when it finds
                 somebody. A silent empty state here would be indistinguishable from a broken query. -->
            {#await findUnlisted({ eventId: data.event.id, search }) then unlisted}
                {#if unlisted.length > 0}
                    <UnlistedMatches eventId={data.event.id} matches={unlisted} />
                {/if}
            {/await}
        {/if}

        {#if groups.length === 0 && !searching}
            <p class="text-muted-foreground py-8 text-center text-sm">
                Nobody has registered for this reunion yet.
            </p>
        {/if}
    </div>
</section>
