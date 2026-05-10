<script lang="ts">
import { enhance } from '$app/forms'
import { EVENT_STATUSES } from '$lib/general/constants'

let { data } = $props()
</script>

<svelte:head>
    <title>Manage Events — Admin</title>
</svelte:head>

<section class="card bg-base-100 col-span-12 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Create New Event</h2>
        <form
            method="POST"
            action="?/create_event"
            use:enhance
            class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <fieldset class="fieldset">
                <label class="label">Title</label>
                <input
                    name="title"
                    type="text"
                    class="input w-full"
                    placeholder="Family Reunion 2026"
                    required />
            </fieldset>
            <fieldset class="fieldset">
                <label class="label">Year</label>
                <input
                    name="year"
                    type="number"
                    class="input w-full"
                    value={new Date().getFullYear()}
                    required />
            </fieldset>
            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</section>

<section class="card bg-base-100 col-span-12 shadow-xs overflow-hidden">
    <div class="card-body grow-0">
        <h2 class="card-title">All Events</h2>
    </div>
    {#if data.events.length === 0}
        <div class="card-body pt-0">
            <p class="text-base-content/60">No events yet.</p>
        </div>
    {:else}
        <div class="space-y-3 p-4 md:hidden">
            {#each data.events as event}
                <div class="rounded-lg border border-base-200 p-4">
                    <div class="flex items-center justify-between">
                        <a href="/admin/events/{event.id}" class="link link-primary font-medium">
                            {event.title}
                        </a>
                        <span class="text-sm text-base-content/60">{event.year}</span>
                    </div>
                    <div class="mt-3 flex items-center justify-between">
                        <form method="POST" action="?/update_status" use:enhance>
                            <input type="hidden" name="eventId" value={event.id} />
                            <select
                                name="status"
                                class="select select-sm"
                                onchange={(e) => e.currentTarget.form?.submit()}>
                                {#each EVENT_STATUSES as s}
                                    <option value={s} selected={event.status === s}>{s}</option>
                                {/each}
                            </select>
                        </form>
                        <a href="/admin/events/{event.id}" class="btn btn-ghost btn-sm">Edit</a>
                    </div>
                </div>
            {/each}
        </div>
        <div class="hidden overflow-x-auto md:block">
            <table class="table table-zebra">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Year</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.events as event}
                        <tr>
                            <td>
                                <a href="/admin/events/{event.id}" class="link link-primary">
                                    {event.title}
                                </a>
                            </td>
                            <td>{event.year}</td>
                            <td>
                                <form
                                    method="POST"
                                    action="?/update_status"
                                    use:enhance
                                    class="inline">
                                    <input type="hidden" name="eventId" value={event.id} />
                                    <select
                                        name="status"
                                        class="select select-xs"
                                        onchange={(e) => e.currentTarget.form?.submit()}>
                                        {#each EVENT_STATUSES as s}
                                            <option value={s} selected={event.status === s}>
                                                {s}
                                            </option>
                                        {/each}
                                    </select>
                                </form>
                            </td>
                            <td>
                                <a href="/admin/events/{event.id}" class="btn btn-ghost btn-xs">
                                    Edit Details
                                </a>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</section>
