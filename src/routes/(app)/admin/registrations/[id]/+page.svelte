<script lang="ts">
import { Check, Copy, Mail, TriangleAlert, UserPlus } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { AdminDataView } from '$lib/components'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import * as Table from '$lib/components/ui/table'
import { formatPrice } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'
import AddMemberForm from '../../../register/AddMemberForm.svelte'

const statusVariantsValue = {
    paid: 'default',
    waived: 'secondary',
    pending: 'outline',
    refunded: 'destructive',
} as const

const SETTABLE_STATUSES = ['pending', 'paid', 'waived'] as const

let { data, form: actionData } = $props()

let showAddForm = $state(false)
let copiedEmail = $state(false)

let isCancelled = $derived(data.registration.status === 'refunded')

function statusVariant(status: string) {
    return statusVariantsValue[status as keyof typeof statusVariantsValue] ?? 'outline'
}

async function handleCopyEmail() {
    await navigator.clipboard.writeText(data.registration.contactEmail)
    copiedEmail = true
}
</script>

<svelte:head>
    <title>{data.registration.contactName} — Registrations</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-6">
    <div class="flex flex-col gap-1">
        <a href="/admin/registrations" class="text-sm text-muted-foreground hover:text-foreground"
            >← Registrations</a>
        <div class="flex flex-wrap items-center gap-3">
            <h1>{data.registration.contactName}</h1>
            <Badge variant={statusVariant(data.registration.status)}>
                {data.registration.status}
            </Badge>
        </div>
        <p class="text-muted-foreground text-sm">
            {data.event.title} · {data.members.length}
            {data.members.length === 1 ? 'person' : 'people'} · ${formatPrice(data.totalCents)}
        </p>
    </div>

    {#if actionData?.memberAdded}
        <Alert>
            <Check class="size-4" />
            <AlertTitle>Member added</AlertTitle>
            <AlertDescription>
                No payment was taken. Their place is recorded at the tier's price.
            </AlertDescription>
        </Alert>
    {/if}

    {#if actionData?.statusChanged}
        <Alert>
            <Check class="size-4" />
            <AlertTitle>Status set to {actionData.newStatus}</AlertTitle>
        </Alert>
    {/if}

    {#if actionData?.linkReissued}
        <Alert>
            <Mail class="size-4" />
            <AlertTitle>New management link sent</AlertTitle>
            <AlertDescription>
                Their previous link no longer works — only the new one in that email.
            </AlertDescription>
        </Alert>
    {/if}

    {#if actionData?.reissueError}
        <Alert variant="destructive">
            <TriangleAlert class="size-4" />
            <AlertTitle>Could not send the new link</AlertTitle>
            <AlertDescription>{actionData.reissueError}</AlertDescription>
        </Alert>
    {/if}

    {#if isCancelled}
        <Alert variant="destructive">
            <TriangleAlert class="size-4" />
            <AlertTitle>This registration was cancelled and refunded</AlertTitle>
            <AlertDescription>
                It cannot be added to or reinstated — the money has gone back. Ask them to register
                again.
            </AlertDescription>
        </Alert>
    {/if}

    <!-- Contact -->
    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-2 text-sm">
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-muted-foreground">Email</span>
                <span class="font-medium">{data.registration.contactEmail}</span>
                <Button type="button" variant="ghost" size="xs" onclick={handleCopyEmail}>
                    {#if copiedEmail}
                        <Check class="size-3" /> Copied
                    {:else}
                        <Copy class="size-3" /> Copy
                    {/if}
                </Button>
            </div>
            {#if data.registration.contactPhone}
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-muted-foreground">Phone</span>
                    <span class="font-medium">{data.registration.contactPhone}</span>
                </div>
            {/if}
        </CardContent>
    </Card>

    <!-- Party -->
    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Party</CardTitle>
        </CardHeader>
        <CardContent>
            <AdminDataView>
                {#snippet mobileCards()}
                    <div class="flex flex-col gap-3">
                        {#each data.members as member (member.id)}
                            {@const born = formatPartialBirthDate(
                                member.birthYear,
                                member.birthMonth,
                                member.birthDay,
                            )}
                            <div class="rounded-lg border p-3">
                                <div class="flex items-start justify-between gap-2">
                                    <p class="font-medium">{member.name}</p>
                                    <span class="tabular-nums"
                                        >${formatPrice(member.priceCents)}</span>
                                </div>
                                <p class="text-muted-foreground mt-0.5 text-xs">
                                    {member.tierLabel}{#if born}
                                        · b. {born}{/if}{#if member.shirtSize}
                                        · shirt {member.shirtSize}{/if}
                                </p>
                                <p class="text-muted-foreground mt-1 text-xs">
                                    {member.stripePaymentIntentId
                                        ? 'Paid online'
                                        : 'Recorded offline'}
                                </p>
                            </div>
                        {/each}
                    </div>
                {/snippet}

                {#snippet desktopTable()}
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>Name</Table.Head>
                                <Table.Head>Tier</Table.Head>
                                <Table.Head>Born</Table.Head>
                                <Table.Head>Shirt</Table.Head>
                                <Table.Head>How paid</Table.Head>
                                <Table.Head class="text-right">Price</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each data.members as member (member.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium">{member.name}</Table.Cell>
                                    <Table.Cell>{member.tierLabel}</Table.Cell>
                                    <Table.Cell class="text-muted-foreground">
                                        {formatPartialBirthDate(
                                            member.birthYear,
                                            member.birthMonth,
                                            member.birthDay,
                                        ) || '—'}
                                    </Table.Cell>
                                    <Table.Cell class="text-muted-foreground">
                                        {member.shirtSize ?? '—'}
                                    </Table.Cell>
                                    <Table.Cell class="text-muted-foreground">
                                        {member.stripePaymentIntentId ? 'Online' : 'Offline'}
                                    </Table.Cell>
                                    <Table.Cell class="text-right tabular-nums">
                                        ${formatPrice(member.priceCents)}
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                {/snippet}
            </AdminDataView>

            <Separator class="my-4" />
            <div class="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span class="tabular-nums">${formatPrice(data.totalCents)}</span>
            </div>
        </CardContent>
    </Card>

    <!-- Add a member, offline -->
    {#if !isCancelled}
        {#if showAddForm}
            <AddMemberForm
                registrationId={data.registration.id}
                tiers={data.tiers}
                shirtsEnabled={data.event.shirtsEnabled}
                action="?/add_member"
                title="Add a member (no payment)"
                submitLabel="Add to party"
                submittingLabel="Adding…"
                submitNote="Records their place at the tier's price. No payment is taken and no
                    checkout is opened."
                onCancel={() => (showAddForm = false)} />
        {:else}
            <div>
                <Button onclick={() => (showAddForm = true)}>
                    <UserPlus class="size-4" />
                    Add a member
                </Button>
            </div>
        {/if}
    {/if}

    <!-- Payment status -->
    {#if !isCancelled}
        <Card>
            <CardHeader class="pb-3">
                <CardTitle class="text-base">Payment status</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
                <p class="text-muted-foreground text-sm">
                    Record that a paper registration's payment arrived, or that it has been waived.
                </p>
                <form method="POST" action="?/set_status" use:enhance class="flex flex-wrap gap-2">
                    {#each SETTABLE_STATUSES as status (status)}
                        <Button
                            type="submit"
                            name="status"
                            value={status}
                            variant={data.registration.status === status ? 'default' : 'outline'}
                            size="sm"
                            disabled={data.registration.status === status}>
                            {status}
                        </Button>
                    {/each}
                </form>
            </CardContent>
        </Card>
    {/if}

    <!-- Management link -->
    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Management link</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
            <p class="text-muted-foreground text-sm">
                The existing link cannot be shown or resent — only a hash of it is stored, so nobody
                including an admin can recover it. Sending a new one <strong>replaces</strong> theirs:
                the old link stops working.
            </p>
            <form method="POST" action="?/reissue_link" use:enhance>
                <Button type="submit" variant="outline" size="sm">
                    <Mail class="size-4" />
                    Email a new link to {data.registration.contactEmail}
                </Button>
            </form>
        </CardContent>
    </Card>
</section>
