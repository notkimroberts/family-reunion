<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'

let { data } = $props()
</script>

<PageTitle title="Admin Dashboard" />

<div class="max-w-6xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="stat bg-base-100 shadow-md rounded-box">
            <div class="stat-title">Total Users</div>
            <div class="stat-value text-primary">{data.metrics.totalUsers}</div>
        </div>
        <div class="stat bg-base-100 shadow-md rounded-box">
            <div class="stat-title">Paid Registrations</div>
            <div class="stat-value text-secondary">{data.metrics.totalRegistrations}</div>
        </div>
        <div class="stat bg-base-100 shadow-md rounded-box">
            <div class="stat-title">Total Revenue</div>
            <div class="stat-value text-accent">
                ${(data.metrics.totalRevenueCents / 100).toFixed(2)}
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card bg-base-100 shadow-md">
            <div class="card-body">
                <h2 class="card-title">Quick Links</h2>
                <ul class="menu">
                    <li><a href="/admin/users">Manage Users</a></li>
                    <li><a href="/admin/events">Manage Events</a></li>
                    <li><a href="/admin/photos">Manage Photos</a></li>
                    <li><a href="/admin/storefront">Storefront Settings</a></li>
                </ul>
            </div>
        </div>

        <div class="card bg-base-100 shadow-md">
            <div class="card-body">
                <h2 class="card-title">Reunion Events</h2>
                {#if data.events.length === 0}
                    <p class="text-base-content/60">No events created yet.</p>
                {:else}
                    <div class="overflow-x-auto">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Year</th>
                                    <th>Status</th>
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
                                            <span
                                                class="badge badge-sm"
                                                class:badge-success={event.status === 'open'}
                                                class:badge-warning={event.status === 'draft'}
                                                class:badge-neutral={event.status === 'closed' ||
                                                    event.status === 'archived'}>
                                                {event.status}
                                            </span>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
