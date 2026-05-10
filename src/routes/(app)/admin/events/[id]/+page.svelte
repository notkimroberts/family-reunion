<script lang="ts">
import { enhance } from '$app/forms'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<svelte:head>
    <title>Edit {data.event.title} — Admin</title>
</svelte:head>

<section class="col-span-12">
    <p class="text-base-content/60">
        Year: {data.event.year} | Status: {data.event.status}
    </p>
</section>

<section class="card bg-base-100 col-span-12 shadow-xs">
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
                                <button type="submit" class="btn btn-ghost btn-xs text-error">
                                    Delete
                                </button>
                            </form>
                        </div>
                        <div class="mt-1 flex gap-4 text-sm text-base-content/60">
                            <span>Ages {tier.minAge}–{tier.maxAge ?? '∞'}</span>
                            <span class="ml-auto font-medium text-base-content">
                                ${formatPrice(tier.priceCents)}
                            </span>
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
                                            class="btn btn-ghost btn-xs text-error">
                                            Delete
                                        </button>
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
                <label class="label">Label</label>
                <input
                    name="label"
                    type="text"
                    class="input input-sm w-full"
                    placeholder="Adult"
                    required />
            </fieldset>
            <fieldset class="fieldset">
                <label class="label">Min Age</label>
                <input
                    name="minAge"
                    type="number"
                    class="input input-sm w-full"
                    value="0"
                    required />
            </fieldset>
            <fieldset class="fieldset">
                <label class="label">Max Age</label>
                <input name="maxAge" type="number" class="input input-sm w-full" placeholder="∞" />
            </fieldset>
            <fieldset class="fieldset">
                <label class="label">Price ($)</label>
                <input
                    name="price"
                    type="number"
                    step="0.01"
                    class="input input-sm w-full"
                    required />
            </fieldset>
            <button type="submit" class="btn btn-primary btn-sm col-span-2 md:col-span-1">
                Add Tier
            </button>
        </form>
    </div>
</section>

<section class="card bg-base-100 col-span-12 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Program Details</h2>
        <form method="POST" action="?/update_event" use:enhance class="space-y-4">
            <hr class="border-base-content/5 my-4 border-t-2" />
            <h3 class="text-sm font-bold text-base-content/50">Venue</h3>

            <fieldset class="fieldset w-full">
                <label class="label">Venue Name</label>
                <input
                    name="venueName"
                    type="text"
                    class="input w-full"
                    value={data.event.venue?.name ?? ''} />
            </fieldset>
            <fieldset class="fieldset w-full">
                <label class="label">Venue Address</label>
                <input
                    name="venueAddress"
                    type="text"
                    class="input w-full"
                    value={data.event.venue?.address ?? ''} />
            </fieldset>
            <fieldset class="fieldset w-full">
                <label class="label">Venue Description</label>
                <textarea name="venueDescription" class="textarea w-full"
                    >{data.event.venue?.description ?? ''}</textarea>
            </fieldset>

            <hr class="border-base-content/5 my-4 border-t-2" />
            <h3 class="text-sm font-bold text-base-content/50">Menu & Drinks</h3>

            <fieldset class="fieldset w-full">
                <label class="label">Menu (one item per line)</label>
                <textarea name="menu" class="textarea h-24 w-full"
                    >{data.event.menu?.join('\n') ?? ''}</textarea>
            </fieldset>
            <fieldset class="fieldset w-full">
                <label class="label">Drinks (one item per line)</label>
                <textarea name="drinks" class="textarea h-24 w-full"
                    >{data.event.drinks?.join('\n') ?? ''}</textarea>
            </fieldset>

            <hr class="border-base-content/5 my-4 border-t-2" />
            <h3 class="text-sm font-bold text-base-content/50">Schedule & Recommendations</h3>

            <fieldset class="fieldset w-full">
                <label class="label">Schedule (JSON array)</label>
                <p class="text-xs text-base-content/50 mb-1">
                    [{`{"day":"Sat","time":"9am","activity":"Breakfast"}`}]
                </p>
                <textarea name="schedule" class="textarea h-24 w-full"
                    >{data.event.schedule
                        ? JSON.stringify(data.event.schedule, null, 2)
                        : ''}</textarea>
            </fieldset>
            <fieldset class="fieldset w-full">
                <label class="label">Recommended Sites (JSON array)</label>
                <p class="text-xs text-base-content/50 mb-1">
                    [{`{"name":"Park","description":"Nice!"}`}]
                </p>
                <textarea name="recommendedSites" class="textarea h-24 w-full"
                    >{data.event.recommendedSites
                        ? JSON.stringify(data.event.recommendedSites, null, 2)
                        : ''}</textarea>
            </fieldset>
            <fieldset class="fieldset w-full">
                <label class="label">Recommended Activities (JSON array)</label>
                <p class="text-xs text-base-content/50 mb-1">
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
</section>

<section class="col-span-12">
    <a href="/admin/events" class="btn btn-ghost">&larr; Back to Events</a>
</section>
