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

/* Locale and zone are both pinned so the server-rendered string and the hydrated one agree — Svelte does
   not recompute template text on hydration, so a mismatch leaves the server's value (Node on Railway is
   UTC) on screen for good. formatViewerDateTime is the util for reader-local instants, but it is
   browser-only by design and prints a clock time; the day an account was created needs neither. */
const CREATED_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
})

const usersQuery = getAdminUsers()

function createdLabel(value: Date): string {
    return CREATED_FORMATTER.format(new Date(value))
}

/* Better Auth leaves role unset on its own inserts, so the column is nullable. An account without
   'admin' cannot pass the layout guard at all — worth naming rather than hiding behind a blank cell. */
function roleLabel(role: string | null): string {
    if (!role) {
        return 'No role'
    }
    return `${role.slice(0, 1).toUpperCase()}${role.slice(1)}`
}
</script>

<svelte:head>
    <title>Admin accounts — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-4 xl:col-span-8">
    <div class="flex flex-col gap-1">
        <h1>Admin accounts</h1>
        <p class="text-muted-foreground text-sm">
            Who can sign in here. Accounts are made from the command line with
            <code class="rounded bg-muted px-1 py-0.5 text-xs">bun run admin:create</code> — there is
            no screen for adding or removing one.
        </p>
    </div>

    {#await usersQuery}
        <p class="text-muted-foreground text-sm">Loading accounts…</p>
    {:then users}
        {#if users.length === 0}
            <p class="text-muted-foreground text-sm">No accounts yet.</p>
        {:else}
            <AdminDataView>
                {#snippet mobileCards()}
                    <div class="flex flex-col gap-2">
                        {#each users as adminUser (adminUser.id)}
                            <div class="flex flex-col gap-1 rounded-lg border bg-card px-4 py-3">
                                <div class="flex items-start justify-between gap-2">
                                    <p class="min-w-0 text-sm font-medium">{adminUser.name}</p>
                                    <Badge
                                        variant={adminUser.role === 'admin'
                                            ? 'secondary'
                                            : 'outline'}>
                                        {roleLabel(adminUser.role)}
                                    </Badge>
                                </div>
                                <p class="text-muted-foreground break-all text-xs">
                                    {adminUser.email}
                                </p>
                                <p class="text-muted-foreground text-xs">
                                    Added {createdLabel(adminUser.createdAt)}
                                </p>
                            </div>
                        {/each}
                    </div>
                {/snippet}
                {#snippet desktopTable()}
                    <Card>
                        <CardContent class="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Added</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {#each users as adminUser (adminUser.id)}
                                        <TableRow>
                                            <TableCell class="text-sm font-medium">
                                                {adminUser.name}
                                            </TableCell>
                                            <TableCell class="text-muted-foreground text-sm">
                                                {adminUser.email}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={adminUser.role === 'admin'
                                                        ? 'secondary'
                                                        : 'outline'}>
                                                    {roleLabel(adminUser.role)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell class="text-muted-foreground text-sm">
                                                {createdLabel(adminUser.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    {/each}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                {/snippet}
            </AdminDataView>
        {/if}
    {/await}
</section>
