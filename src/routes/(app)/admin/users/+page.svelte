<script lang="ts">
import { enhance } from '$app/forms'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'

let { data } = $props()
let editingId = $state<string | null>(null)
</script>

<svelte:head>
    <title>Manage Users — Admin</title>
</svelte:head>

{#if data.profiles.length === 0}
    <section class="col-span-12">
        <p class="text-muted-foreground">No user profiles yet.</p>
    </section>
{:else}
    <!-- Mobile cards -->
    <section class="col-span-12 lg:hidden">
        <div class="space-y-3">
            {#each data.profiles as profile}
                <div class="rounded-lg border bg-card p-4 {profile.isDeleted ? 'opacity-50' : ''}">
                    <div class="flex items-center justify-between">
                        <span class="font-mono text-xs">{profile.userId.slice(0, 12)}…</span>
                        {#if profile.isDeleted}
                            <Badge variant="destructive">Deleted</Badge>
                        {:else}
                            <Badge variant="secondary">Active</Badge>
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
                                <Input
                                    name="phone"
                                    type="text"
                                    class="w-full"
                                    value={profile.phone ?? ''} />
                                <div class="mt-2 flex gap-2">
                                    <Button type="submit" size="sm" class="flex-1">Save</Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="flex-1"
                                        onclick={() => (editingId = null)}>Cancel</Button>
                                </div>
                            </form>
                        {:else}
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-muted-foreground">
                                    {profile.phone ?? 'No phone'}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onclick={() => (editingId = profile.id)}>Edit</Button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <!-- Desktop table -->
    <section class="col-span-12 hidden lg:block">
        <Card>
            <CardContent class="p-0">
                <div class="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.profiles as profile}
                                <TableRow class={profile.isDeleted ? 'opacity-50' : ''}>
                                    <TableCell class="font-mono text-xs"
                                        >{profile.userId}</TableCell>
                                    <TableCell>
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
                                                <input
                                                    type="hidden"
                                                    name="profileId"
                                                    value={profile.id} />
                                                <div class="flex items-center gap-2">
                                                    <Input
                                                        name="phone"
                                                        type="text"
                                                        class="h-7 text-xs"
                                                        value={profile.phone ?? ''} />
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        class="h-7 px-2 text-xs">Save</Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        class="h-7 px-2 text-xs"
                                                        onclick={() => (editingId = null)}
                                                        >Cancel</Button>
                                                </div>
                                            </form>
                                        {:else}
                                            {profile.phone ?? '—'}
                                        {/if}
                                    </TableCell>
                                    <TableCell>
                                        {#if profile.isDeleted}
                                            <Badge variant="destructive">Deleted</Badge>
                                        {:else}
                                            <Badge variant="secondary">Active</Badge>
                                        {/if}
                                    </TableCell>
                                    <TableCell>
                                        {#if editingId !== profile.id}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => (editingId = profile.id)}
                                                >Edit</Button>
                                        {/if}
                                    </TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </section>
{/if}
