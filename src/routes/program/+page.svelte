<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'

let { data } = $props()
</script>

<PageTitle title="Program" />

<div class="max-w-4xl mx-auto p-6">
    {#if !data.event}
        <div class="text-center py-12">
            <h1 class="text-3xl font-bold mb-4">No Active Reunion</h1>
            <p class="text-base-content/60">Check back soon for details about the next reunion!</p>
        </div>
    {:else}
        <h1 class="text-3xl font-bold mb-2">{data.event.title}</h1>
        <p class="text-lg text-base-content/70 mb-8">
            <span class="badge badge-primary">{data.registrantCount} registered households</span>
        </p>

        {#if data.event.venue}
            <div class="card bg-base-100 shadow-md mb-6">
                <div class="card-body">
                    <h2 class="card-title">Venue</h2>
                    <p class="text-xl font-semibold">{data.event.venue.name}</p>
                    <p class="text-base-content/70">{data.event.venue.address}</p>
                    {#if data.event.venue.description}
                        <p class="mt-2">{data.event.venue.description}</p>
                    {/if}
                    {#if data.event.venue.imageUrl}
                        <img
                            src={data.event.venue.imageUrl}
                            alt={data.event.venue.name}
                            class="rounded-lg mt-4 max-h-64 object-cover" />
                    {/if}
                </div>
            </div>
        {/if}

        {#if data.event.schedule && data.event.schedule.length > 0}
            <div class="card bg-base-100 shadow-md mb-6">
                <div class="card-body">
                    <h2 class="card-title">Schedule</h2>
                    <div class="space-y-3 md:hidden">
                        {#each data.event.schedule as item}
                            <div class="rounded-lg border border-base-200 p-3">
                                <div class="font-medium">{item.activity}</div>
                                <div class="mt-1 text-sm text-base-content/60">
                                    {item.day} &middot; {item.time}
                                </div>
                            </div>
                        {/each}
                    </div>
                    <div class="hidden overflow-x-auto md:block">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Time</th>
                                    <th>Activity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each data.event.schedule as item}
                                    <tr>
                                        <td>{item.day}</td>
                                        <td>{item.time}</td>
                                        <td>{item.activity}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        {/if}

        {#if data.event.menu && data.event.menu.length > 0}
            <div class="card bg-base-100 shadow-md mb-6">
                <div class="card-body">
                    <h2 class="card-title">Menu</h2>
                    <ul class="list-disc list-inside space-y-1">
                        {#each data.event.menu as item}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </div>
            </div>
        {/if}

        {#if data.event.drinks && data.event.drinks.length > 0}
            <div class="card bg-base-100 shadow-md mb-6">
                <div class="card-body">
                    <h2 class="card-title">Drinks</h2>
                    <ul class="list-disc list-inside space-y-1">
                        {#each data.event.drinks as item}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </div>
            </div>
        {/if}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {#if data.event.recommendedSites && data.event.recommendedSites.length > 0}
                <div class="card bg-base-100 shadow-md">
                    <div class="card-body">
                        <h2 class="card-title">Recommended Sites</h2>
                        <ul class="space-y-2">
                            {#each data.event.recommendedSites as site}
                                <li>
                                    <p class="font-medium">{site.name}</p>
                                    {#if site.description}
                                        <p class="text-sm text-base-content/60">
                                            {site.description}
                                        </p>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </div>
                </div>
            {/if}

            {#if data.event.recommendedActivities && data.event.recommendedActivities.length > 0}
                <div class="card bg-base-100 shadow-md">
                    <div class="card-body">
                        <h2 class="card-title">Recommended Activities</h2>
                        <ul class="space-y-2">
                            {#each data.event.recommendedActivities as activity}
                                <li>
                                    <p class="font-medium">{activity.name}</p>
                                    {#if activity.description}
                                        <p class="text-sm text-base-content/60">
                                            {activity.description}
                                        </p>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </div>
                </div>
            {/if}
        </div>

        <div class="text-center">
            <a href="/register" class="btn btn-primary btn-lg">Register Now</a>
        </div>
    {/if}
</div>
