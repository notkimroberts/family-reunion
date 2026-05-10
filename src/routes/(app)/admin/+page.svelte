<script lang="ts">
let { data } = $props()
</script>

<section class="stats stats-vertical xl:stats-horizontal bg-base-100 col-span-12 w-full shadow-xs">
    <div class="stat">
        <div class="stat-title">Total Users</div>
        <div class="stat-value text-primary">{data.metrics.totalUsers}</div>
    </div>
    <div class="stat">
        <div class="stat-title">Paid Registrations</div>
        <div class="stat-value text-secondary">{data.metrics.totalRegistrations}</div>
    </div>
    <div class="stat">
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-accent">
            ${(data.metrics.totalRevenueCents / 100).toFixed(2)}
        </div>
    </div>
</section>

<section class="card bg-base-100 col-span-12 xl:col-span-6 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Quick Links</h2>
        <ul class="menu">
            <li><a href="/admin/users">Manage Users</a></li>
            <li><a href="/admin/events">Manage Events</a></li>
            <li><a href="/admin/photos">Manage Photos</a></li>
            <li><a href="/admin/storefront">Storefront Settings</a></li>
        </ul>
    </div>
</section>

<section class="card bg-base-100 col-span-12 xl:col-span-6 shadow-xs overflow-hidden">
    <div class="card-body grow-0">
        <h2 class="card-title">Reunion Events</h2>
    </div>
    {#if data.events.length === 0}
        <div class="card-body pt-0">
            <p class="text-base-content/60">No events created yet.</p>
        </div>
    {:else}
        <div class="overflow-x-auto">
            <table class="table table-zebra">
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
                            <td>
                                <a href="/admin/events/{event.id}" class="link link-primary">
                                    {event.title}
                                </a>
                            </td>
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
</section>
