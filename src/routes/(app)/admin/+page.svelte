<script lang="ts">
import { ClipboardCheck, DollarSign, Users } from '@lucide/svelte'
import { getContext } from 'svelte'
import { Badge } from '$lib/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { APP_NAME } from '$lib/general/constants'
import type { AdminContext } from '$lib/types/adminContext'
import { cn, formatPrice } from '$lib/utils'

const statusVariant = (status: string) => {
    if (status === 'open') {
        return 'default' as const
    }
    if (status === 'draft') {
        return 'secondary' as const
    }
    return 'outline' as const
}

function deltaLabel(delta: number): string {
    const sign = delta >= 0 ? '+' : ''
    return `${sign}${delta}`
}

function revDeltaLabel(deltaCents: number): string {
    const sign = deltaCents >= 0 ? '+' : '-'
    return `${sign}${formatPrice(Math.abs(deltaCents))}`
}

let { data } = $props()

const adminCtx = getContext<AdminContext>('admin')

type EventMetric = { eventId: string; registrationCount: number; revenueCents: string | null }

let selectedMetrics = $derived<EventMetric | undefined>(
    adminCtx.selectedEventId === 'all'
        ? undefined
        : (data.eventMetrics.find((m) => m.eventId === adminCtx.selectedEventId) ?? undefined),
)

let allTimeRegistrations = $derived(
    data.eventMetrics.reduce((s, m) => s + Number(m.registrationCount), 0),
)
let allTimeRevenue = $derived(
    data.eventMetrics.reduce((s, m) => s + Number(m.revenueCents ?? 0), 0),
)

let displayRegistrations = $derived(
    selectedMetrics !== undefined
        ? Number(selectedMetrics.registrationCount)
        : allTimeRegistrations,
)
let displayRevenue = $derived(
    selectedMetrics !== undefined ? Number(selectedMetrics.revenueCents ?? 0) : allTimeRevenue,
)

let selectedEventIdx = $derived(adminCtx.events.findIndex((e) => e.id === adminCtx.selectedEventId))
let prevMetrics = $derived<EventMetric | undefined>(
    selectedMetrics !== undefined &&
        selectedEventIdx >= 0 &&
        selectedEventIdx < adminCtx.events.length - 1
        ? (data.eventMetrics.find((m) => m.eventId === adminCtx.events[selectedEventIdx + 1].id) ??
              undefined)
        : undefined,
)

let regDelta = $derived(
    prevMetrics !== undefined && selectedMetrics !== undefined
        ? Number(selectedMetrics.registrationCount) - Number(prevMetrics.registrationCount)
        : undefined,
)
let revDelta = $derived(
    prevMetrics !== undefined && selectedMetrics !== undefined
        ? Number(selectedMetrics.revenueCents ?? 0) - Number(prevMetrics.revenueCents ?? 0)
        : undefined,
)

let displayEvents = $derived(
    adminCtx.selectedEventId === 'all'
        ? data.events
        : data.events.filter((e) => e.id === adminCtx.selectedEventId),
)
</script>

<svelte:head>
    <title>Admin — {APP_NAME}</title>
</svelte:head>

<section class="col-span-12">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardContent class="pt-6">
                <div class="flex items-start gap-4">
                    <div class="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                        <Users class="h-5 w-5" />
                    </div>
                    <div>
                        <p class="text-sm text-muted-foreground">Total Users</p>
                        <p class="text-3xl font-bold">{data.totalUsers}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent class="pt-6">
                <div class="flex items-start gap-4">
                    <div class="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                        <ClipboardCheck class="h-5 w-5" />
                    </div>
                    <div>
                        <p class="text-sm text-muted-foreground">Paid Registrations</p>
                        <p class="text-3xl font-bold">{displayRegistrations}</p>
                        {#if regDelta !== undefined}
                            <p
                                class={cn(
                                    'text-xs mt-0.5',
                                    regDelta >= 0 ? 'text-green-600' : 'text-destructive',
                                )}>
                                {deltaLabel(regDelta)} vs prev year
                            </p>
                        {/if}
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent class="pt-6">
                <div class="flex items-start gap-4">
                    <div class="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                        <DollarSign class="h-5 w-5" />
                    </div>
                    <div>
                        <p class="text-sm text-muted-foreground">Total Revenue</p>
                        <p class="text-3xl font-bold">${formatPrice(displayRevenue)}</p>
                        {#if revDelta !== undefined}
                            <p
                                class={cn(
                                    'text-xs mt-0.5',
                                    revDelta >= 0 ? 'text-green-600' : 'text-destructive',
                                )}>
                                {revDeltaLabel(revDelta)} vs prev year
                            </p>
                        {/if}
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</section>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Reunion Events</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
            {#if displayEvents.length === 0}
                <p class="text-muted-foreground px-6 pb-6">No events found.</p>
            {:else}
                <div class="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each displayEvents as event}
                                <TableRow>
                                    <TableCell>
                                        <a
                                            href="/admin/events/{event.id}"
                                            class="text-primary hover:underline">
                                            {event.title}
                                        </a>
                                    </TableCell>
                                    <TableCell>{event.year}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(event.status)}>
                                            {event.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/if}
        </CardContent>
    </Card>
</section>
