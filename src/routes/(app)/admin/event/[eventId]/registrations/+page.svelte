<script lang="ts">
import { Plus, Search } from '@lucide/svelte'
import { AdminDataView } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import * as Table from '$lib/components/ui/table'
import { cn, formatPrice, getPaymentState } from '$lib/utils'
import RegistrationStatusBadge from './RegistrationStatusBadge.svelte'
import { getRegistrationTotals } from './registrationTotals'

/* The organiser's whole job on one screen: what the year adds up to on the left, the people on the
   right. Merged from two prototype variants — C's persistent status panel beside the list, A's status
   filter chips and its amber marking of rows that need chasing. C's separate "To chase" block is gone
   on purpose: it listed the same registrations twice, once in the panel and once in the table. */

const FILTERS = ['All', 'Paid', 'Pending', 'Waived', 'Refunded'] as const

/* Both pending states are 'pending' in the database and need opposite follow-ups. Telling them apart
   from a list row only became possible once RegistrationSummary.status stopped being a plain `string` —
   getPaymentState would not accept it before. */
const chaseReasonValue = {
    checkout_incomplete: 'Started paying online and stopped — they may think it failed',
    awaiting_payment: 'Entered from a paper form; the money has not arrived',
}

let { data } = $props()

let totals = $derived(getRegistrationTotals(data.registrations))

let search = $state('')
let filter = $state<(typeof FILTERS)[number]>('All')

function chaseReason(registration: (typeof data.registrations)[number]): string | undefined {
    const state = getPaymentState(registration)
    return chaseReasonValue[state as keyof typeof chaseReasonValue]
}

let visible = $derived(
    data.registrations
        .filter((r) => filter === 'All' || r.status === filter.toLowerCase())
        .filter((r) => {
            const term = search.trim().toLowerCase()
            return (
                term === '' ||
                r.contactName.toLowerCase().includes(term) ||
                r.contactEmail.toLowerCase().includes(term)
            )
        }),
)
</script>

<svelte:head>
    <title>Registrations — Admin</title>
</svelte:head>

<section class="col-span-12 grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
    <!-- Stays on screen while you work the list, rather than being a dashboard you navigate away from. -->
    <aside class="flex flex-col gap-4 self-start rounded-lg border bg-card p-4 lg:sticky lg:top-6">
        <div class="flex flex-col gap-3">
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-sm">People coming</span>
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
        </div>

        {#if totals.chaseCount > 0}
            <Separator />
            <p class="text-muted-foreground text-xs">
                {totals.chaseCount}
                {totals.chaseCount === 1 ? 'registration needs' : 'registrations need'} chasing — marked
                in the list.
            </p>
        {/if}

        <Separator />

        <Button href="/admin/event/{data.event.id}/registrations/new" size="sm">
            <Plus class="size-4" />
            Add paper registration
        </Button>
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <div class="relative min-w-48 flex-1">
                <Search
                    class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input bind:value={search} placeholder="Search name or email" class="pl-8" />
            </div>
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
        </div>

        {#if data.registrations.length === 0}
            <p class="text-muted-foreground text-sm">
                Nobody has registered for this year yet. Paper forms can be entered with the button
                on the left.
            </p>
        {:else if visible.length === 0}
            <p class="text-muted-foreground text-sm">Nothing matches that.</p>
        {:else}
            <AdminDataView>
                {#snippet mobileCards()}
                    <div class="flex flex-col gap-3">
                        {#each visible as registration (registration.id)}
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
                                <p class="text-muted-foreground mt-2 text-xs">
                                    {registration.memberCount}
                                    {registration.memberCount === 1 ? 'person' : 'people'} · ${formatPrice(
                                        registration.totalCents,
                                    )}
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
                                <Table.Head class="text-right">Party</Table.Head>
                                <Table.Head class="text-right">Total</Table.Head>
                                <Table.Head></Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each visible as registration (registration.id)}
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
