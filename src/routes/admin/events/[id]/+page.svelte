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
                <div class="form-control col-span-2 md:col-span-1">
                    <label class="label"><span class="label-text">Label</span></label>
                    <input
                        name="label"
                        type="text"
                        class="input input-bordered input-sm"
                        placeholder="Adult"
                        required />
                </div>
                <div class="form-control">
                    <label class="label"><span class="label-text">Min Age</span></label>
                    <input
                        name="minAge"
                        type="number"
                        class="input input-bordered input-sm"
                        value="0"
                        required />
                </div>
                <div class="form-control">
                    <label class="label"><span class="label-text">Max Age</span></label>
                    <input
                        name="maxAge"
                        type="number"
                        class="input input-bordered input-sm"
                        placeholder="∞" />
                </div>
                <div class="form-control">
                    <label class="label"><span class="label-text">Price ($)</span></label>
                    <input
                        name="price"
                        type="number"
                        step="0.01"
                        class="input input-bordered input-sm"
                        required />
                </div>
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
                <div class="form-control w-full">
                    <label class="label"><span class="label-text">Venue Name</span></label>
                    <input
                        name="venueName"
                        type="text"
                        class="input input-bordered"
                        value={data.event.venue?.name ?? ''} />
                </div>
                <div class="form-control w-full">
                    <label class="label"><span class="label-text">Venue Address</span></label>
                    <input
                        name="venueAddress"
                        type="text"
                        class="input input-bordered"
                        value={data.event.venue?.address ?? ''} />
                </div>
                <div class="form-control w-full">
                    <label class="label"><span class="label-text">Venue Description</span></label>
                    <textarea name="venueDescription" class="textarea textarea-bordered"
                        >{data.event.venue?.description ?? ''}</textarea>
                </div>

                <div class="divider">Menu & Drinks</div>
                <div class="form-control w-full">
                    <label class="label"
                        ><span class="label-text">Menu (one item per line)</span></label>
                    <textarea name="menu" class="textarea textarea-bordered h-24"
                        >{data.event.menu?.join('\n') ?? ''}</textarea>
                </div>
                <div class="form-control w-full">
                    <label class="label"
                        ><span class="label-text">Drinks (one item per line)</span></label>
                    <textarea name="drinks" class="textarea textarea-bordered h-24"
                        >{data.event.drinks?.join('\n') ?? ''}</textarea>
                </div>

                <div class="divider">Schedule & Recommendations</div>
                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text">Schedule (JSON array)</span>
                        <span class="label-text-alt"
                            >[{`{"day":"Sat","time":"9am","activity":"Breakfast"}`}]</span>
                    </label>
                    <textarea name="schedule" class="textarea textarea-bordered h-24"
                        >{data.event.schedule
                            ? JSON.stringify(data.event.schedule, null, 2)
                            : ''}</textarea>
                </div>
                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text">Recommended Sites (JSON array)</span>
                        <span class="label-text-alt"
                            >[{`{"name":"Park","description":"Nice!"}`}]</span>
                    </label>
                    <textarea name="recommendedSites" class="textarea textarea-bordered h-24"
                        >{data.event.recommendedSites
                            ? JSON.stringify(data.event.recommendedSites, null, 2)
                            : ''}</textarea>
                </div>
                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text">Recommended Activities (JSON array)</span>
                        <span class="label-text-alt"
                            >[{`{"name":"Hiking","description":"Trail nearby"}`}]</span>
                    </label>
                    <textarea name="recommendedActivities" class="textarea textarea-bordered h-24"
                        >{data.event.recommendedActivities
                            ? JSON.stringify(data.event.recommendedActivities, null, 2)
                            : ''}</textarea>
                </div>

                <button type="submit" class="btn btn-primary">Save Program</button>
            </form>
        </div>
    </div>

    <div class="mt-4">
        <a href="/admin/events" class="btn btn-ghost">&larr; Back to Events</a>
    </div>
</div>
