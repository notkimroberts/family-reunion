<script lang="ts">
import { enhance } from '$app/forms'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<svelte:head>
    <title>Edit {data.event.title} — Admin</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-2">{data.event.title}</h1>
    <p class="text-base-content/60 mb-6">Year: {data.event.year} | Status: {data.event.status}</p>

    <div class="card bg-base-100 shadow-md mb-6">
        <div class="card-body">
            <h2 class="card-title">Pricing Tiers</h2>

            {#if data.tiers.length > 0}
                <div class="mb-4 space-y-3 md:hidden">
                    {#each data.tiers as tier}
                        <div class="rounded-lg border border-base-200 p-3">
                            <div class="flex items-center justify-between">
                                <span class="font-medium">{tier.label}</span>
                                <form method="POST" action="?/delete_tier" use:enhance>
                                    <input type="hidden" name="tierId" value={tier.id} />
                                    <button type="submit" class="btn btn-ghost btn-xs text-error"
                                        >Delete</button>
                                </form>
                            </div>
                            <div class="mt-1 flex gap-4 text-sm text-base-content/60">
                                <span>Ages {tier.minAge}–{tier.maxAge ?? '∞'}</span>
                                <span class="ml-auto font-medium text-base-content"
                                    >${formatPrice(tier.priceCents)}</span>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="mb-4 hidden overflow-x-auto md:block">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Label</th>
                                <th>Min Age</th>
                                <th>Max Age</th>
                                <th>Price</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.tiers as tier}
                                <tr>
                                    <td>{tier.label}</td>
                                    <td>{tier.minAge}</td>
                                    <td>{tier.maxAge ?? '∞'}</td>
                                    <td>${formatPrice(tier.priceCents)}</td>
                                    <td>
                                        <form method="POST" action="?/delete_tier" use:enhance>
                                            <input type="hidden" name="tierId" value={tier.id} />
                                            <button
                                                type="submit"
                                                class="btn btn-ghost btn-xs text-error"
                                                >Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}

            <form
                method="POST"
                action="?/add_tier"
                use:enhance
                class="grid grid-cols-2 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
                <fieldset class="fieldset col-span-2 md:col-span-1">
                    <legend class="fieldset-legend">Label</legend>
                    <input
                        name="label"
                        type="text"
                        class="input input-sm w-full"
                        placeholder="Adult"
                        required />
                </fieldset>
                <fieldset class="fieldset">
                    <legend class="fieldset-legend">Min Age</legend>
                    <input
                        name="minAge"
                        type="number"
                        class="input input-sm w-full"
                        value="0"
                        required />
                </fieldset>
                <fieldset class="fieldset">
                    <legend class="fieldset-legend">Max Age</legend>
                    <input
                        name="maxAge"
                        type="number"
                        class="input input-sm w-full"
                        placeholder="∞" />
                </fieldset>
                <fieldset class="fieldset">
                    <legend class="fieldset-legend">Price ($)</legend>
                    <input
                        name="price"
                        type="number"
                        step="0.01"
                        class="input input-sm w-full"
                        required />
                </fieldset>
                <button type="submit" class="btn btn-primary btn-sm col-span-2 md:col-span-1"
                    >Add Tier</button>
            </form>
        </div>
    </div>

    <div class="card bg-base-100 shadow-md mb-6">
        <div class="card-body">
            <h2 class="card-title">Program Details</h2>
            <form method="POST" action="?/update_event" use:enhance class="space-y-4">
                <div class="divider">Venue</div>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Venue Name</legend>
                    <input
                        name="venueName"
                        type="text"
                        class="input w-full"
                        value={data.event.venue?.name ?? ''} />
                </fieldset>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Venue Address</legend>
                    <input
                        name="venueAddress"
                        type="text"
                        class="input w-full"
                        value={data.event.venue?.address ?? ''} />
                </fieldset>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Venue Description</legend>
                    <textarea name="venueDescription" class="textarea w-full"
                        >{data.event.venue?.description ?? ''}</textarea>
                </fieldset>

                <div class="divider">Menu & Drinks</div>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Menu (one item per line)</legend>
                    <textarea name="menu" class="textarea h-24 w-full"
                        >{data.event.menu?.join('\n') ?? ''}</textarea>
                </fieldset>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Drinks (one item per line)</legend>
                    <textarea name="drinks" class="textarea h-24 w-full"
                        >{data.event.drinks?.join('\n') ?? ''}</textarea>
                </fieldset>

                <div class="divider">Schedule & Recommendations</div>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Schedule (JSON array)</legend>
                    <p class="fieldset-label">
                        [{`{"day":"Sat","time":"9am","activity":"Breakfast"}`}]
                    </p>
                    <textarea name="schedule" class="textarea h-24 w-full"
                        >{data.event.schedule
                            ? JSON.stringify(data.event.schedule, null, 2)
                            : ''}</textarea>
                </fieldset>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Recommended Sites (JSON array)</legend>
                    <p class="fieldset-label">[{`{"name":"Park","description":"Nice!"}`}]</p>
                    <textarea name="recommendedSites" class="textarea h-24 w-full"
                        >{data.event.recommendedSites
                            ? JSON.stringify(data.event.recommendedSites, null, 2)
                            : ''}</textarea>
                </fieldset>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Recommended Activities (JSON array)</legend>
                    <p class="fieldset-label">
                        [{`{"name":"Hiking","description":"Trail nearby"}`}]
                    </p>
                    <textarea name="recommendedActivities" class="textarea h-24 w-full"
                        >{data.event.recommendedActivities
                            ? JSON.stringify(data.event.recommendedActivities, null, 2)
                            : ''}</textarea>
                </fieldset>

                <button type="submit" class="btn btn-primary">Save Program</button>
            </form>
        </div>
    </div>

    <div class="mt-4">
        <a href="/admin/events" class="btn btn-ghost">&larr; Back to Events</a>
    </div>
</div>
