<script lang="ts">
import { enhance } from '$app/forms'
import { EVENT_STATUSES } from '$lib/general/constants'

let { data } = $props()
</script>

<svelte:head>
    <title>Manage Events — Admin</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Manage Events</h1>

    <div class="card bg-base-100 shadow-md mb-6">
        <div class="card-body">
            <h2 class="card-title">Create New Event</h2>
            <form
                method="POST"
                action="?/create_event"
                use:enhance
                class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div class="form-control">
                    <label class="label"><span class="label-text">Title</span></label>
                    <input
                        name="title"
                        type="text"
                        class="input input-bordered"
                        placeholder="Family Reunion 2026"
                        required />
                </div>
                <div class="form-control">
                    <label class="label"><span class="label-text">Year</span></label>
                    <input
                        name="year"
                        type="number"
                        class="input input-bordered"
                        value={new Date().getFullYear()}
                        required />
                </div>
                <button type="submit" class="btn btn-primary">Create</button>
            </form>
        </div>
    </div>

    <div class="card bg-base-100 shadow-md">
        <div class="card-body">
            <h2 class="card-title">All Events</h2>
            {#if data.events.length === 0}
                <p class="text-base-content/60">No events yet.</p>
            {:else}
                <div class="space-y-3 md:hidden">
                    {#each data.events as event}
                        <div class="rounded-lg border border-base-200 p-4">
                            <div class="flex items-center justify-between">
                                <a
                                    href="/admin/events/{event.id}"
                                    class="link link-primary font-medium">{event.title}</a>
                                <span class="text-sm text-base-content/60">{event.year}</span>
                            </div>
                            <div class="mt-3 flex items-center justify-between">
                                <form method="POST" action="?/update_status" use:enhance>
                                    <input type="hidden" name="eventId" value={event.id} />
                                    <select
                                        name="status"
                                        class="select select-bordered select-sm"
                                        onchange={(e) => e.currentTarget.form?.submit()}>
                                        {#each EVENT_STATUSES as s}
                                            <option value={s} selected={event.status === s}
                                                >{s}</option>
                                        {/each}
                                    </select>
                                </form>
                                <a href="/admin/events/{event.id}" class="btn btn-ghost btn-sm"
                                    >Edit</a>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="hidden overflow-x-auto md:block">
                    <table class="table">
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
                                    <td
                                        ><a
                                            href="/admin/events/{event.id}"
                                            class="link link-primary">{event.title}</a
                                        ></td>
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
                                                class="select select-bordered select-xs"
                                                onchange={(e) => e.currentTarget.form?.submit()}>
                                                {#each EVENT_STATUSES as s}
                                                    <option value={s} selected={event.status === s}
                                                        >{s}</option>
                                                {/each}
                                            </select>
                                        </form>
                                    </td>
                                    <td>
                                        <a
                                            href="/admin/events/{event.id}"
                                            class="btn btn-ghost btn-xs">Edit Details</a>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>

    <div class="mt-4">
        <a href="/admin" class="btn btn-ghost">&larr; Back to Dashboard</a>
    </div>
</div>
