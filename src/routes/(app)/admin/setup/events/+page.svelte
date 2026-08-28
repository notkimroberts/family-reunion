<script lang="ts">
import { enhance } from '$app/forms'
import { AdminDataView } from '$lib/components'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { EVENT_STATUSES } from '$lib/general/constants'
import { formatDateRange } from '$lib/utils'
import { getAdminEvents } from '../../getAdminEvents.remote'
import type { ReunionEvent } from '../../types'

/* `form` is the only channel for either action's fail(). This page rendered no form prop at all, so
   the 409 the one_open_event index raises on opening a second year arrived and vanished — the
   status control looked like it simply did nothing. */
let { form } = $props()

const eventsQuery = getAdminEvents()

/* Matches the year switcher in AdminHeader — the same kind of quiet control. text-sm below md keeps
   it legible at the 44px tap height app.css enforces there. */
const STATUS_SELECT_CLASS =
    'h-8 rounded-md border border-input bg-transparent px-2 text-sm md:text-xs'

/* Both ends or nothing: formatDateRange needs a pair, and a year with one date set is still being
   planned rather than scheduled. */
function formatEventDates({ startDate, endDate }: ReunionEvent): string | undefined {
    if (!startDate || !endDate) {
        return undefined
    }
    return formatDateRange(startDate, endDate)
}
</script>

<svelte:head>
    <title>Reunion years — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-1 xl:col-span-8">
    <h1>Reunion years</h1>
    <p class="text-muted-foreground text-sm">
        Add a year, then open it when registration should start. Only one year can be open at a time
        — close the current one first.
    </p>
</section>

{#if form?.error}
    <section class="col-span-12 xl:col-span-8">
        <Alert variant="destructive">
            <AlertDescription>{form.error}</AlertDescription>
        </Alert>
    </section>
{/if}

<section class="col-span-12 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle>Add a year</CardTitle>
            <CardDescription>
                Starts as a draft, with Adult and Child tiers to price in its settings.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form
                method="POST"
                action="?/create_event"
                use:enhance={() => {
                    /* update() as well as the query refresh. Returning a callback replaces SvelteKit's
                       default, so without it applyAction and invalidateAll never run: `form` keeps the
                       previous result — a 409 "Another event is already open" would still sit above a
                       later successful create — and admin/+layout.server.ts is not re-run, so the
                       header's year switcher would not list the new year until a hard reload. */
                    return async ({ update }) => {
                        await update()
                        eventsQuery.refresh()
                    }
                }}
                class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <Field.Field class="gap-2">
                    <Field.Label for="title">Title</Field.Label>
                    <Input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="Family Reunion 2026"
                        required />
                </Field.Field>
                <Field.Field class="gap-2">
                    <Field.Label for="year">Year</Field.Label>
                    <Input
                        id="year"
                        name="year"
                        type="number"
                        value={new Date().getFullYear()}
                        required />
                </Field.Field>
                <Button type="submit" variant="secondary">Add year</Button>
            </form>
        </CardContent>
    </Card>
</section>

{#await eventsQuery then events}
    <section class="col-span-12 xl:col-span-8">
        <Card>
            <CardHeader>
                <CardTitle>All years</CardTitle>
            </CardHeader>
            <CardContent class="px-0">
                {#if events.length === 0}
                    <p class="text-muted-foreground px-6 text-sm">No reunion years yet.</p>
                {:else}
                    <AdminDataView>
                        {#snippet mobileCards()}
                            <div class="flex flex-col gap-3 px-4">
                                {#each events as event (event.id)}
                                    {@const dates = formatEventDates(event)}
                                    <div class="flex flex-col gap-3 rounded-lg border p-4">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="flex min-w-0 flex-col gap-1">
                                                <a
                                                    href="/admin/event/{event.id}/settings"
                                                    class="truncate text-sm font-medium hover:underline">
                                                    {event.title}
                                                </a>
                                                {#if dates}
                                                    <p class="text-muted-foreground text-xs">
                                                        {dates}
                                                    </p>
                                                {/if}
                                            </div>
                                            <span class="text-muted-foreground text-sm">
                                                {event.year}
                                            </span>
                                        </div>
                                        <div class="flex items-center justify-between gap-3">
                                            <form
                                                method="POST"
                                                action="?/update_status"
                                                use:enhance={() => {
                                                    return async () => {
                                                        eventsQuery.refresh()
                                                    }
                                                }}>
                                                <input
                                                    type="hidden"
                                                    name="eventId"
                                                    value={event.id} />
                                                <!-- form.submit() fires no submit event, so the
                                                     use:enhance above never runs and this posts the
                                                     whole page. Left as it is deliberately:
                                                     requestSubmit() would switch it to the enhanced
                                                     path, a bits-ui Select has no .form at all. -->
                                                <select
                                                    name="status"
                                                    aria-label="Status for {event.title}"
                                                    class={STATUS_SELECT_CLASS}
                                                    onchange={(e) =>
                                                        e.currentTarget.form?.submit()}>
                                                    {#each EVENT_STATUSES as s (s)}
                                                        <option
                                                            value={s}
                                                            selected={event.status === s}
                                                            >{s}</option>
                                                    {/each}
                                                </select>
                                            </form>
                                            <Button
                                                href="/admin/event/{event.id}/settings"
                                                variant="ghost"
                                                size="sm">Settings</Button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/snippet}
                        {#snippet desktopTable()}
                            <div class="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Dates</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead class="text-right">
                                                <span class="sr-only">Actions</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {#each events as event (event.id)}
                                            <TableRow>
                                                <TableCell class="text-muted-foreground">
                                                    {event.year}
                                                </TableCell>
                                                <TableCell>
                                                    <a
                                                        href="/admin/event/{event.id}/settings"
                                                        class="font-medium hover:underline">
                                                        {event.title}
                                                    </a>
                                                </TableCell>
                                                <TableCell class="text-muted-foreground">
                                                    {formatEventDates(event) ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <form
                                                        method="POST"
                                                        action="?/update_status"
                                                        use:enhance={() => {
                                                            return async () => {
                                                                eventsQuery.refresh()
                                                            }
                                                        }}>
                                                        <input
                                                            type="hidden"
                                                            name="eventId"
                                                            value={event.id} />
                                                        <select
                                                            name="status"
                                                            aria-label="Status for {event.title}"
                                                            class={STATUS_SELECT_CLASS}
                                                            onchange={(e) =>
                                                                e.currentTarget.form?.submit()}>
                                                            {#each EVENT_STATUSES as s (s)}
                                                                <option
                                                                    value={s}
                                                                    selected={event.status === s}
                                                                    >{s}</option>
                                                            {/each}
                                                        </select>
                                                    </form>
                                                </TableCell>
                                                <TableCell class="text-right">
                                                    <Button
                                                        href="/admin/event/{event.id}/settings"
                                                        variant="ghost"
                                                        size="sm">Settings</Button>
                                                </TableCell>
                                            </TableRow>
                                        {/each}
                                    </TableBody>
                                </Table>
                            </div>
                        {/snippet}
                    </AdminDataView>
                {/if}
            </CardContent>
        </Card>
    </section>
{/await}
