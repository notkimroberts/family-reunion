<script lang="ts">
import { Check, Copy, Mail, Pencil, TriangleAlert } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { AdminDataView } from '$lib/components'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import * as Table from '$lib/components/ui/table'
import { formatPrice, getMemberPaymentOrigin, getPaymentState } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'
import RegistrationEditForm from './RegistrationEditForm.svelte'
import RegistrationHistory from './RegistrationHistory.svelte'

/* How the registration's money actually stands. Deliberately not a restatement of `status`: a
   pending registration that reached Stripe and stopped needs chasing quite differently from one
   awaiting a cheque, and this page previously called both "Offline". */
const paymentCopyValue = {
    paid_online: { label: 'Paid online', variant: 'default' as const, note: undefined },
    paid_offline: {
        label: 'Paid offline',
        variant: 'default' as const,
        note: 'Recorded by an organiser — no card payment was taken.',
    },
    checkout_incomplete: {
        label: 'Checkout not completed',
        variant: 'destructive' as const,
        note: 'They started paying online and did not finish, so they may well believe registration failed. Nothing is owed by post — chase the payment, do not wait for a cheque.',
    },
    awaiting_payment: {
        label: 'Awaiting payment',
        variant: 'outline' as const,
        note: 'Entered from a paper form. Mark it paid once the money arrives.',
    },
    waived: {
        label: 'Covered',
        variant: 'secondary' as const,
        note: 'Comped — there is nothing to pay.',
    },
    cancelled: {
        label: 'Cancelled and refunded',
        variant: 'destructive' as const,
        note: 'The money has gone back. It cannot be added to or reinstated — ask them to register again.',
    },
}

const originCopyValue = {
    paid_online: 'Paid online',
    added_online: 'Added online',
    recorded_offline: 'Recorded offline',
    unpaid: 'Not paid',
}

let { data, form: actionData } = $props()

let savedChanges = $derived(actionData?.changes ?? [])
let editing = $state(false)
let copiedEmail = $state(false)

let payment = $derived(getPaymentState(data.registration))
let paymentCopy = $derived(paymentCopyValue[payment])
let isCancelled = $derived(payment === 'cancelled')
let isPaid = $derived(data.registration.status === 'paid')

/* A party that came through Stripe carries grossed-up prices; one entered by hand carries net tier
   prices. Both are honest records of what that person cost, but side by side in one total they look
   like an error, so name the reason rather than leaving it to be puzzled out. */
let origins = $derived(
    data.members.map((member) => getMemberPaymentOrigin(member, data.registration)),
)
let hasMixedPriceBasis = $derived(
    origins.includes('recorded_offline') &&
        origins.some((origin) => origin === 'paid_online' || origin === 'added_online'),
)

async function handleCopyEmail() {
    await navigator.clipboard.writeText(data.registration.contactEmail)
    copiedEmail = true
}
</script>

<svelte:head>
    <title>{data.registration.contactName} — Registrations</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
            <a
                href="/admin/registrations"
                class="text-sm text-muted-foreground hover:text-foreground">← Registrations</a>
            <div class="flex flex-wrap items-center gap-3">
                <h1>{data.registration.contactName}</h1>
                <Badge variant={paymentCopy.variant}>{paymentCopy.label}</Badge>
            </div>
            <p class="text-muted-foreground text-sm">
                {data.event.title} · {data.members.length}
                {data.members.length === 1 ? 'person' : 'people'} · ${formatPrice(data.totalCents)}
            </p>
        </div>
        {#if !editing && !isCancelled}
            <Button onclick={() => (editing = true)}>
                <Pencil class="size-4" />
                Edit registration
            </Button>
        {/if}
    </div>

    {#if actionData?.saved}
        <Alert>
            <Check class="size-4" />
            <AlertTitle>
                {savedChanges.length === 0 ? 'Nothing to change' : 'Changes saved'}
            </AlertTitle>
            <AlertDescription>
                {#if savedChanges.length === 0}
                    Nothing was different, so the registrant was not emailed.
                {:else}
                    <ul class="flex flex-col gap-0.5">
                        {#each savedChanges as change (change)}
                            <li>{change}</li>
                        {/each}
                    </ul>
                    {#if actionData.notified}
                        <p class="mt-2">
                            {data.registration.contactEmail} was emailed a summary and a link that works.
                        </p>
                    {/if}
                {/if}
            </AlertDescription>
        </Alert>
    {/if}

    {#if actionData?.notifyError}
        <Alert variant="destructive">
            <TriangleAlert class="size-4" />
            <AlertTitle>Saved, but they have not been told</AlertTitle>
            <AlertDescription>{actionData.notifyError}</AlertDescription>
        </Alert>
    {/if}

    {#if actionData?.saveError}
        <Alert variant="destructive">
            <TriangleAlert class="size-4" />
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{actionData.saveError}</AlertDescription>
        </Alert>
    {/if}

    {#if actionData?.memberAdded}
        <Alert>
            <Check class="size-4" />
            <AlertTitle>Member added</AlertTitle>
            <AlertDescription>
                No payment was taken. Their place is recorded at the tier's face value.
            </AlertDescription>
        </Alert>
    {/if}

    {#if actionData?.linkReissued}
        <Alert>
            <Mail class="size-4" />
            <AlertTitle>New management link sent</AlertTitle>
            <AlertDescription>
                Their previous link keeps working for a week, so nothing they already have is
                broken.
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

    {#if paymentCopy.note}
        <Alert
            variant={payment === 'checkout_incomplete' || isCancelled ? 'destructive' : 'default'}>
            <TriangleAlert class="size-4" />
            <AlertTitle>{paymentCopy.label}</AlertTitle>
            <AlertDescription>{paymentCopy.note}</AlertDescription>
        </Alert>
    {/if}

    {#if editing}
        <RegistrationEditForm
            form={data.form}
            members={data.members}
            tiers={data.tiers}
            {isPaid}
            onCancel={() => (editing = false)}
            onSaved={() => (editing = false)} />
    {:else}
        <Card>
            <CardHeader class="pb-3">
                <CardTitle class="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-2 text-sm">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-muted-foreground">Email</span>
                    <span class="font-medium">{data.registration.contactEmail}</span>
                    <Button type="button" variant="ghost" size="sm" onclick={handleCopyEmail}>
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

        <Card>
            <CardHeader class="pb-3">
                <CardTitle class="text-base">Party</CardTitle>
            </CardHeader>
            <CardContent>
                <AdminDataView>
                    {#snippet mobileCards()}
                        <div class="flex flex-col gap-3">
                            {#each data.members as member, index (member.id)}
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
                                        {originCopyValue[
                                            origins[index]
                                        ]}{#if origins[index] !== 'recorded_offline'}
                                            · incl. card fee{/if}
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
                                    <Table.Head>Payment</Table.Head>
                                    <Table.Head class="text-right">Price</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.members as member, index (member.id)}
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
                                            {originCopyValue[origins[index]]}
                                        </Table.Cell>
                                        <Table.Cell class="text-right tabular-nums">
                                            ${formatPrice(member.priceCents)}
                                            {#if origins[index] !== 'recorded_offline'}
                                                <span
                                                    class="text-muted-foreground block text-xs font-normal">
                                                    incl. card fee
                                                </span>
                                            {/if}
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
                {#if hasMixedPriceBasis}
                    <p class="text-muted-foreground mt-2 text-xs">
                        This party mixes online prices, which include the card processing fee, with
                        offline ones at the tier's face value. Each row records what that person
                        actually cost.
                    </p>
                {/if}
            </CardContent>
        </Card>

        <Card>
            <CardHeader class="pb-3">
                <CardTitle class="text-base">Management link</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
                <p class="text-muted-foreground text-sm">
                    The existing link cannot be shown — only a hash of it is stored, so nobody
                    including an admin can recover it. Sending a new one issues a fresh link and
                    keeps their current one working for a week.
                </p>
                <form method="POST" action="?/reissue_link" use:enhance>
                    <Button type="submit" variant="outline" size="sm">
                        <Mail class="size-4" />
                        Email a new link to {data.registration.contactEmail}
                    </Button>
                </form>
            </CardContent>
        </Card>

        <RegistrationHistory history={data.history} />
    {/if}
</section>
