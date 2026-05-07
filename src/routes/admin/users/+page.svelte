<script lang="ts">
import { enhance } from '$app/forms'

let { data } = $props()
let editingId = $state<string | null>(null)
</script>

<svelte:head>
    <title>Manage Users — Admin</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Manage Users</h1>

    {#if data.profiles.length === 0}
        <p class="text-base-content/60">No user profiles yet.</p>
    {:else}
        <div class="space-y-3 md:hidden">
            {#each data.profiles as profile}
                <div
                    class="rounded-lg border border-base-200 p-4"
                    class:opacity-50={profile.isDeleted}>
                    <div class="flex items-center justify-between">
                        <span class="font-mono text-xs">{profile.userId.slice(0, 12)}…</span>
                        {#if profile.isDeleted}
                            <span class="badge badge-error badge-sm">Deleted</span>
                        {:else}
                            <span class="badge badge-success badge-sm">Active</span>
                        {/if}
                    </div>
                    <div class="mt-2">
                        {#if editingId === profile.id}
                            <form
                                method="POST"
                                action="?/update_user"
                                use:enhance={() => {
                                    return async ({ update }) => {
                                        editingId = null
                                        update()
                                    }
                                }}>
                                <input type="hidden" name="profileId" value={profile.id} />
                                <input
                                    name="phone"
                                    type="text"
                                    class="input input-bordered input-sm w-full"
                                    value={profile.phone ?? ''} />
                                <div class="mt-2 flex gap-2">
                                    <button type="submit" class="btn btn-primary btn-sm flex-1"
                                        >Save</button>
                                    <button
                                        type="button"
                                        class="btn btn-ghost btn-sm flex-1"
                                        onclick={() => (editingId = null)}>Cancel</button>
                                </div>
                            </form>
                        {:else}
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-base-content/60"
                                    >{profile.phone ?? 'No phone'}</span>
                                <button
                                    class="btn btn-ghost btn-sm"
                                    onclick={() => (editingId = profile.id)}>Edit</button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
        <div class="hidden overflow-x-auto md:block">
            <table class="table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.profiles as profile}
                        <tr class:opacity-50={profile.isDeleted}>
                            <td class="font-mono text-xs">{profile.userId}</td>
                            <td>
                                {#if editingId === profile.id}
                                    <form
                                        method="POST"
                                        action="?/update_user"
                                        use:enhance={() => {
                                            return async ({ update }) => {
                                                editingId = null
                                                update()
                                            }
                                        }}>
                                        <input type="hidden" name="profileId" value={profile.id} />
                                        <input
                                            name="phone"
                                            type="text"
                                            class="input input-bordered input-xs"
                                            value={profile.phone ?? ''} />
                                        <button type="submit" class="btn btn-primary btn-xs mt-1"
                                            >Save</button>
                                        <button
                                            type="button"
                                            class="btn btn-ghost btn-xs mt-1"
                                            onclick={() => (editingId = null)}>Cancel</button>
                                    </form>
                                {:else}
                                    {profile.phone ?? '—'}
                                {/if}
                            </td>
                            <td>
                                {#if profile.isDeleted}
                                    <span class="badge badge-error badge-sm">Deleted</span>
                                {:else}
                                    <span class="badge badge-success badge-sm">Active</span>
                                {/if}
                            </td>
                            <td>
                                {#if editingId !== profile.id}
                                    <button
                                        class="btn btn-ghost btn-xs"
                                        onclick={() => (editingId = profile.id)}>Edit</button>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <div class="mt-4">
        <a href="/admin" class="btn btn-ghost">&larr; Back to Dashboard</a>
    </div>
</div>
