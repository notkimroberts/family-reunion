<script lang="ts">
import { AdminDataView } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Card, CardContent } from '$lib/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { getAdminUsers } from '../getAdminUsers.remote'

const usersQuery = getAdminUsers()
</script>

<svelte:head>
    <title>Manage Users — Admin</title>
</svelte:head>

{#await usersQuery then users}
    <section class="col-span-12">
        <div class="flex items-center gap-3">
            <h1>Users</h1>
            <Badge variant="secondary">{users.length}</Badge>
        </div>
    </section>

    {#if users.length === 0}
        <section class="col-span-12">
            <p class="text-muted-foreground">No accounts yet.</p>
        </section>
    {:else}
        <section class="col-span-12">
            <AdminDataView>
                {#snippet mobileCards()}
                    <div class="space-y-3">
                        {#each users as u}
                            <div class="rounded-lg border bg-card p-4">
                                <div class="flex items-center justify-between">
                                    <span class="font-medium text-sm">{u.name}</span>
                                    {#if u.role === 'admin'}
                                        <Badge variant="default">Admin</Badge>
                                    {:else}
                                        <Badge variant="secondary">User</Badge>
                                    {/if}
                                </div>
                                <p class="text-xs text-muted-foreground mt-1">{u.email}</p>
                            </div>
                        {/each}
                    </div>
                {/snippet}
                {#snippet desktopTable()}
                    <Card>
                        <CardContent class="p-0">
                            <div class="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {#each users as u}
                                            <TableRow>
                                                <TableCell class="font-medium">{u.name}</TableCell>
                                                <TableCell class="text-sm text-muted-foreground"
                                                    >{u.email}</TableCell>
                                                <TableCell>
                                                    {#if u.role === 'admin'}
                                                        <Badge variant="default">Admin</Badge>
                                                    {:else}
                                                        <Badge variant="secondary">User</Badge>
                                                    {/if}
                                                </TableCell>
                                                <TableCell class="text-sm text-muted-foreground">
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        {/each}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                {/snippet}
            </AdminDataView>
        </section>
    {/if}
{/await}
