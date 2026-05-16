<script lang="ts">
import { Badge } from '$lib/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { formatPrice } from '$lib/utils'

const statusVariant = (status: string) => {
    if (status === 'open') {
        return 'default' as const
    }
    if (status === 'draft') {
        return 'secondary' as const
    }
    return 'outline' as const
}

let { data } = $props()
</script>

<!-- Stats -->
<section class="col-span-12">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardContent class="pt-6">
                <p class="text-sm text-muted-foreground">Total Users</p>
                <p class="text-3xl font-bold text-primary">{data.metrics.totalUsers}</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent class="pt-6">
                <p class="text-sm text-muted-foreground">Paid Registrations</p>
                <p class="text-3xl font-bold">{data.metrics.totalRegistrations}</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent class="pt-6">
                <p class="text-sm text-muted-foreground">Total Revenue</p>
                <p class="text-3xl font-bold">${formatPrice(data.metrics.totalRevenueCents)}</p>
            </CardContent>
        </Card>
    </div>
</section>

<section class="col-span-12 xl:col-span-6">
    <Card>
        <CardHeader>
            <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
            <nav class="flex flex-col gap-1">
                <a
                    href="/admin/users"
                    class="px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >Manage Users</a>
                <a
                    href="/admin/events"
                    class="px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >Manage Events</a>
                <a
                    href="/admin/photos"
                    class="px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >Manage Photos</a>
                <a
                    href="/admin/storefront"
                    class="px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >Storefront Settings</a>
            </nav>
        </CardContent>
    </Card>
</section>

<section class="col-span-12 xl:col-span-6">
    <Card>
        <CardHeader>
            <CardTitle>Reunion Events</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
            {#if data.events.length === 0}
                <p class="text-muted-foreground px-6 pb-6">No events created yet.</p>
            {:else}
                <div class="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.events as event}
                                <TableRow>
                                    <TableCell>
                                        <a
                                            href="/admin/events/{event.id}"
                                            class="text-primary hover:underline">
                                            {event.title}
                                        </a>
                                    </TableCell>
                                    <TableCell>{event.year}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(event.status)}
                                            >{event.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/if}
        </CardContent>
    </Card>
</section>
