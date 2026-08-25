<script lang="ts">
import { Plus } from '@lucide/svelte'
import { AdminDataView } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import * as Table from '$lib/components/ui/table'
import { formatPrice } from '$lib/utils'

/* Statuses an organiser reads at a glance: paid is the norm, pending means money is still owed,
   waived is comped, refunded is cancelled and kept visible rather than hidden. */
const statusVariantsValue = {
    paid: 'default',
    waived: 'secondary',
    pending: 'outline',
    refunded: 'destructive',
} as const

let { data } = $props()

function statusVariant(status: string) {
    return statusVariantsValue[status as keyof typeof statusVariantsValue] ?? 'outline'
}
</script>

<svelte:head>
    <title>Registrations — Admin</title>
</svelte:head>

<section class="col-span-12">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
            <a href="/admin" class="text-sm text-muted-foreground hover:text-foreground">← Admin</a>
            <h1>Registrations</h1>
            <p class="text-muted-foreground text-sm">
                Open a registration to add someone to their party, record a payment, or re-issue
                their management link.
            </p>
        </div>
        <Button href="/admin/registrations/new">
            <Plus class="size-4" />
            Add paper registration
        </Button>
    </div>

    {#if !data.hasEvent}
        <Card>
            <CardContent class="pt-6">
                <p class="text-muted-foreground">No events yet. Create one first.</p>
                <Button href="/admin/events" variant="outline" class="mt-4">Manage Events</Button>
            </CardContent>
        </Card>
    {:else if data.registrations.length === 0}
        <p class="text-muted-foreground">No registrations for this event yet.</p>
    {:else}
        <AdminDataView>
            {#snippet mobileCards()}
                <div class="flex flex-col gap-3">
                    {#each data.registrations as registration (registration.id)}
                        <a
                            href="/admin/registrations/{registration.id}"
                            class="rounded-lg border bg-card p-4 hover:bg-muted">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="truncate font-medium">{registration.contactName}</p>
                                    <p class="text-muted-foreground mt-0.5 truncate text-xs">
                                        {registration.contactEmail}
                                    </p>
                                </div>
                                <Badge variant={statusVariant(registration.status)}>
                                    {registration.status}
                                </Badge>
                            </div>
                            <p class="text-muted-foreground mt-2 text-xs">
                                {registration.memberCount}
                                {registration.memberCount === 1 ? 'person' : 'people'} · ${formatPrice(
                                    registration.totalCents,
                                )}
                            </p>
                        </a>
                    {/each}
                </div>
            {/snippet}

            {#snippet desktopTable()}
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Contact</Table.Head>
                            <Table.Head>Email</Table.Head>
                            <Table.Head>Status</Table.Head>
                            <Table.Head class="text-right">Party</Table.Head>
                            <Table.Head class="text-right">Total</Table.Head>
                            <Table.Head></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each data.registrations as registration (registration.id)}
                            <Table.Row>
                                <Table.Cell class="font-medium"
                                    >{registration.contactName}</Table.Cell>
                                <Table.Cell class="text-muted-foreground">
                                    {registration.contactEmail}
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge variant={statusVariant(registration.status)}>
                                        {registration.status}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell class="text-right tabular-nums">
                                    {registration.memberCount}
                                </Table.Cell>
                                <Table.Cell class="text-right tabular-nums">
                                    ${formatPrice(registration.totalCents)}
                                </Table.Cell>
                                <Table.Cell class="text-right">
                                    <Button
                                        href="/admin/registrations/{registration.id}"
                                        variant="outline"
                                        size="sm">
                                        Manage
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    </Table.Body>
                </Table.Root>
            {/snippet}
        </AdminDataView>
    {/if}
</section>
