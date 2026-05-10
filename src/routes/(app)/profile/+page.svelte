<script lang="ts">
import { enhance } from '$app/forms'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<section class="card bg-base-100 col-span-12 xl:col-span-8 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Personal Information</h2>

        <form method="POST" action="?/update_profile" use:enhance>
            <fieldset class="fieldset w-full">
                <label class="label">Name</label>
                <input name="name" type="text" class="input w-full" value={data.user.name ?? ''} />
            </fieldset>

            <fieldset class="fieldset w-full">
                <label class="label">Email</label>
                <input type="email" class="input w-full" value={data.user.email ?? ''} disabled />
                <p class="text-xs text-base-content/50 mt-1">Managed by your SSO provider</p>
            </fieldset>

            <fieldset class="fieldset w-full">
                <label class="label">Phone</label>
                <input
                    name="phone"
                    type="tel"
                    class="input w-full"
                    value={data.profile?.phone ?? ''} />
            </fieldset>

            <hr class="border-base-content/5 my-6 border-t-2" />

            <h3 class="text-sm font-bold text-base-content/50 mb-4">Mailing Address</h3>

            <fieldset class="fieldset w-full">
                <label class="label">Street</label>
                <input
                    name="street"
                    type="text"
                    class="input w-full"
                    value={data.profile?.mailingAddress?.street ?? ''} />
            </fieldset>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <fieldset class="fieldset w-full">
                    <label class="label">City</label>
                    <input
                        name="city"
                        type="text"
                        class="input w-full"
                        value={data.profile?.mailingAddress?.city ?? ''} />
                </fieldset>
                <fieldset class="fieldset w-full">
                    <label class="label">State</label>
                    <input
                        name="state"
                        type="text"
                        class="input w-full"
                        value={data.profile?.mailingAddress?.state ?? ''} />
                </fieldset>
            </div>

            <fieldset class="fieldset w-full max-w-xs">
                <label class="label">ZIP Code</label>
                <input
                    name="zip"
                    type="text"
                    class="input w-full"
                    value={data.profile?.mailingAddress?.zip ?? ''} />
            </fieldset>

            <div class="flex justify-end mt-6 gap-4">
                <button type="submit" class="btn btn-primary">Save Profile</button>
            </div>
        </form>
    </div>
</section>

<section class="card bg-base-100 col-span-12 xl:col-span-4 shadow-xs self-start">
    <div class="card-body items-center text-center">
        <div class="avatar avatar-placeholder mb-4">
            <div class="w-20 rounded-full bg-primary text-primary-content">
                <span class="text-3xl">{(data.user.name ?? '?')[0]?.toUpperCase()}</span>
            </div>
        </div>
        <h3 class="font-semibold">{data.user.name}</h3>
        <p class="text-sm text-base-content/60">{data.user.email}</p>
        <div class="mt-4 w-full">
            <a href="/profile/relationships" class="btn btn-outline btn-sm w-full"
                >Manage Relationships</a>
        </div>
    </div>
</section>

<section class="card bg-base-100 col-span-12 shadow-xs overflow-hidden">
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
                <table class="table table-zebra">
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
</section>

<section class="card bg-base-100 col-span-12 shadow-xs border border-error/20">
    <div class="card-body">
        <h2 class="card-title text-error">Danger Zone</h2>
        <p class="text-sm text-base-content/70">
            Deleting your account will hide your profile from all public views. An admin can still
            see your data for record-keeping purposes.
        </p>
        <div class="card-actions justify-end">
            <form
                method="POST"
                action="?/delete_account"
                use:enhance={({ cancel }) => {
                    if (!confirm('Are you sure? This hides your profile from all public views.')) {
                        cancel()
                    }
                }}>
                <button type="submit" class="btn btn-error btn-outline">Delete Account</button>
            </form>
        </div>
    </div>
</section>
