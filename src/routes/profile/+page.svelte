<script lang="ts">
import { enhance } from '$app/forms'
import PageTitle from '$lib/components/PageTitle.svelte'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<PageTitle title="Profile" />

<div class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Your Profile</h1>

    <div class="card bg-base-100 shadow-md">
        <div class="card-body">
            <h2 class="card-title">Personal Information</h2>

            <form method="POST" action="?/update_profile" use:enhance>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Name</legend>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        class="input w-full"
                        value={data.user.name ?? ''} />
                </fieldset>

                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Email</legend>
                    <input
                        id="email"
                        type="email"
                        class="input w-full"
                        value={data.user.email ?? ''}
                        disabled />
                    <p class="fieldset-label">Email is managed by your SSO provider</p>
                </fieldset>

                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Phone</legend>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        class="input w-full"
                        value={data.profile?.phone ?? ''} />
                </fieldset>

                <div class="divider">Mailing Address</div>

                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Street</legend>
                    <input
                        id="street"
                        name="street"
                        type="text"
                        class="input w-full"
                        value={data.profile?.mailingAddress?.street ?? ''} />
                </fieldset>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <fieldset class="fieldset w-full">
                        <legend class="fieldset-legend">City</legend>
                        <input
                            id="city"
                            name="city"
                            type="text"
                            class="input w-full"
                            value={data.profile?.mailingAddress?.city ?? ''} />
                    </fieldset>
                    <fieldset class="fieldset w-full">
                        <legend class="fieldset-legend">State</legend>
                        <input
                            id="state"
                            name="state"
                            type="text"
                            class="input w-full"
                            value={data.profile?.mailingAddress?.state ?? ''} />
                    </fieldset>
                </div>

                <fieldset class="fieldset w-full max-w-xs">
                    <legend class="fieldset-legend">ZIP Code</legend>
                    <input
                        id="zip"
                        name="zip"
                        type="text"
                        class="input w-full"
                        value={data.profile?.mailingAddress?.zip ?? ''} />
                </fieldset>

                <div class="card-actions justify-end mt-4">
                    <button type="submit" class="btn btn-primary">Save Profile</button>
                </div>
            </form>
        </div>
    </div>

    <div class="card bg-base-100 shadow-md mt-6">
        <div class="card-body">
            <h2 class="card-title">Registration History</h2>
            {#if data.registrations.length === 0}
                <p class="text-base-content/60">No registrations yet.</p>
            {:else}
                <div class="space-y-3 md:hidden">
                    {#each data.registrations as reg}
                        <div class="rounded-lg border border-base-200 p-4">
                            <div class="flex items-center justify-between">
                                <span class="font-medium">{reg.eventTitle}</span>
                                <span
                                    class="badge"
                                    class:badge-success={reg.status === 'paid'}
                                    class:badge-warning={reg.status === 'pending'}>
                                    {reg.status}
                                </span>
                            </div>
                            <div class="mt-2 flex justify-between text-sm text-base-content/60">
                                <span>{reg.eventYear}</span>
                                <span>${formatPrice(reg.totalAmountCents)}</span>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="hidden overflow-x-auto md:block">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Year</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.registrations as reg}
                                <tr>
                                    <td>{reg.eventTitle}</td>
                                    <td>{reg.eventYear}</td>
                                    <td>
                                        <span
                                            class="badge"
                                            class:badge-success={reg.status === 'paid'}
                                            class:badge-warning={reg.status === 'pending'}>
                                            {reg.status}
                                        </span>
                                    </td>
                                    <td>${formatPrice(reg.totalAmountCents)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>

    <div class="card bg-base-100 shadow-md mt-6 border border-error/20">
        <div class="card-body">
            <h2 class="card-title text-error">Danger Zone</h2>
            <p>
                Deleting your account will hide your profile from all public views. An admin can
                still see your data for record-keeping purposes.
            </p>
            <div class="card-actions justify-end">
                <form
                    method="POST"
                    action="?/delete_account"
                    use:enhance={({ cancel }) => {
                        if (
                            !confirm('Are you sure? This hides your profile from all public views.')
                        ) {
                            cancel()
                        }
                    }}>
                    <button type="submit" class="btn btn-error btn-outline">Delete Account</button>
                </form>
            </div>
        </div>
    </div>
</div>
