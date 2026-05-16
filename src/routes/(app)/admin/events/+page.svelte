<script lang="ts">
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
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

let { data } = $props()
</script>

<svelte:head>
    <title>Manage Events — Admin</title>
</svelte:head>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
            <form
                method="POST"
                action="?/create_event"
                use:enhance
                class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div class="space-y-1">
                    <label for="title" class="text-sm font-medium">Title</label>
                    <Input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="Family Reunion 2026"
                        required />
                </div>
                <div class="space-y-1">
                    <label for="year" class="text-sm font-medium">Year</label>
                    <Input
                        id="year"
                        name="year"
                        type="number"
                        value={new Date().getFullYear()}
                        required />
                </div>
                <Button type="submit">Create</Button>
            </form>
        </CardContent>
    </Card>
</section>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
            {#if data.events.length === 0}
                <p class="text-muted-foreground px-6 pb-6">No events yet.</p>
            {:else}
                <div class="space-y-3 p-4 md:hidden">
                    {#each data.events as event}
                        <div class="rounded-lg border p-4">
                            <div class="flex items-center justify-between">
                                <a
                                    href="/admin/events/{event.id}"
                                    class="text-primary hover:underline font-medium">
                                    {event.title}
                                </a>
                                <span class="text-sm text-muted-foreground">{event.year}</span>
                            </div>
                            <div class="mt-3 flex items-center justify-between">
                                <form method="POST" action="?/update_status" use:enhance>
                                    <input type="hidden" name="eventId" value={event.id} />
                                    <select
                                        name="status"
                                        class="border rounded-md px-2 py-1 text-sm bg-background"
                                        onchange={(e) => e.currentTarget.form?.submit()}>
                                        {#each EVENT_STATUSES as s}
                                            <option value={s} selected={event.status === s}
                                                >{s}</option>
                                        {/each}
                                    </select>
                                </form>
                                <Button href="/admin/events/{event.id}" variant="ghost" size="sm"
                                    >Edit</Button>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.events as event}
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
                                        <form
                                            method="POST"
                                            action="?/update_status"
                                            use:enhance
                                            class="inline">
                                            <input type="hidden" name="eventId" value={event.id} />
                                            <select
                                                name="status"
                                                class="border rounded-md px-2 py-1 text-xs bg-background"
                                                onchange={(e) => e.currentTarget.form?.submit()}>
                                                {#each EVENT_STATUSES as s}
                                                    <option value={s} selected={event.status === s}
                                                        >{s}</option>
                                                {/each}
                                            </select>
                                        </form>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            href="/admin/events/{event.id}"
                                            variant="ghost"
                                            size="sm">
                                            Edit Details
                                        </Button>
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
