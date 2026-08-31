<script lang="ts">
import { Ban, Check, Copy, Mail, Pencil, TriangleAlert } from '@lucide/svelte'
import { toast } from 'svelte-sonner'
import { enhance } from '$app/forms'
import { page } from '$app/state'
import { AdminDataView } from '$lib/components'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import * as Table from '$lib/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip'
import { formatPrice, getMemberPaymentOrigin, getPaymentState } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'
import RegistrationStatusBadge from '../RegistrationStatusBadge.svelte'
import { getRegistrationMoney } from '../registrationMoney'
import AdminCancelDialog from './AdminCancelDialog.svelte'
import RegistrationEditForm from './RegistrationEditForm.svelte'
import RegistrationHistory from './RegistrationHistory.svelte'
import RegistrationMoneyCard from './RegistrationMoneyCard.svelte'

/* The one thing the status badge cannot say. 'pending' covers both a paper form awaiting a cheque and
   a public registration abandoned at Stripe Checkout, and those need opposite follow-ups — see
   getPaymentState. Rendered as a single line of context under the heading, not as a second status. */
const pendingReasonValue = {
    checkout_incomplete:
        'Started paying online and did not finish, so they may believe registration failed. Nothing is owed by post.',
    awaiting_payment: 'Entered from a paper form. Mark it paid once the money arrives.',
}

const originCopyValue = {
    paid_online: 'Paid online',
    added_online: 'Added online',
    recorded_offline: 'Recorded offline',
    unpaid: 'Not paid',
    comped: 'Comped',
}

let { data, form: actionData } = $props()

/* Action outcomes are transient, so they belong in a toast rather than shoved into the page flow where
   they push the record down and stay until the next navigation.

   Deduped on the identity of actionData: this effect also reads state that changes for other reasons,
   and re-firing a "Changes saved" toast because something unrelated updated would be worse than not
   toasting at all. A fresh action result is always a new object.

   Errors are given no duration, so they sit until dismissed. An organiser who misses "saved, but they
   have not been told" believes the registrant was emailed when they were not — that must not be
   allowed to fade on its own. */
let handledResult: unknown = undefined

$effect(() => {
    if (actionData === handledResult) {
        return
    }
    handledResult = actionData

    if (!actionData) {
        return
    }

    if (actionData.saveError) {
        toast.error(actionData.saveError, { duration: Number.POSITIVE_INFINITY })
    }

    if (actionData.notifyError) {
        toast.error(actionData.notifyError, { duration: Number.POSITIVE_INFINITY })
    }

    if (actionData.reissueError) {
        toast.error(actionData.reissueError, { duration: Number.POSITIVE_INFINITY })
    }

    if (actionData.saved) {
        const changes = actionData.changes ?? []
        if (changes.length === 0) {
            toast.info('Nothing was different, so the registrant was not emailed.')
        } else {
            toast.success(changes.length === 1 ? 'Change saved' : 'Changes saved', {
                description: actionData.notified
                    ? `${changes.join('. ')}. ${data.registration.contactEmail} was emailed a summary and a link that works.`
                    : changes.join('. '),
            })
        }
    }

    if (actionData.cancelError) {
        toast.error(actionData.cancelError, { duration: Number.POSITIVE_INFINITY })
    }

    if (actionData.cancelled) {
        toast.success('Registration cancelled', {
            description:
                'They have been emailed a record of it, including whether a refund is on its way.',
        })
    }

    if (actionData.linkReissued) {
        toast.success('New management link sent', {
            description:
                'Their previous link keeps working for a week, so nothing they already have is broken.',
        })
    }
})
let editing = $state(false)
let copiedEmail = $state(false)
let cancelDialogOpen = $state(false)

let payment = $derived(getPaymentState(data.registration))
let pendingReason = $derived(pendingReasonValue[payment as keyof typeof pendingReasonValue])
let isCancelled = $derived(data.registration.status === 'refunded')
let isPaid = $derived(data.registration.status === 'paid')

/* The same function the money panel beside the list sums, so a booking's fee reads identically in
   both places. totalCents is passed separately because the registration row does not carry it — it
   is the sum of the snapshotted member prices. */
let money = $derived(getRegistrationMoney({ ...data.registration, totalCents: data.totalCents }))

/* A party that came through Stripe carries grossed-up prices; one entered by hand carries net tier
   prices. Both are honest records of what that person cost, but side by side in one total they look
   like an error, so name the reason rather than leaving it to be puzzled out. */
let origins = $derived(
    data.members.map((member) => getMemberPaymentOrigin(member, data.registration)),
)

/* Only these two are certainly grossed up. Testing for "not recorded offline" was wrong the moment
   'comped' existed: a waived party carries the net tier price and read "$160.00 incl. card fee". An
   abandoned checkout is grossed up too, but nothing was charged, so a fee note there says nothing. */
const GROSSED_UP_ORIGINS = ['paid_online', 'added_online']

function includesCardFee(origin: string): boolean {
    return GROSSED_UP_ORIGINS.includes(origin)
}
let hasMixedPriceBasis = $derived(
    origins.includes('recorded_offline') && origins.some(includesCardFee),
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
                href="/admin/event/{data.event.id}/registrations"
                class="text-sm text-muted-foreground hover:text-foreground">← Registrations</a>
            <div class="flex flex-wrap items-center gap-3">
                <h1>{data.registration.contactName}</h1>
                <RegistrationStatusBadge status={data.registration.status} />
            </div>
            <!-- Contact details live here rather than in a card of their own: an email and a phone
                 number are not worth a titled panel, and reading them next to the name is how an
                 organiser actually uses them. -->
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span class="font-medium">{data.registration.contactEmail}</span>
                <Button type="button" variant="ghost" size="sm" onclick={handleCopyEmail}>
                    {#if copiedEmail}
                        <Check class="size-3" /> Copied
                    {:else}
                        <Copy class="size-3" /> Copy
                    {/if}
                </Button>
                {#if data.registration.contactPhone}
                    <span class="text-muted-foreground">·</span>
                    <span class="font-medium">{data.registration.contactPhone}</span>
                {/if}
                <span class="text-muted-foreground">·</span>
                <span class="text-muted-foreground">
                    Party of {data.members.length} · ${formatPrice(data.totalCents)}
                </span>
            </div>
            {#if pendingReason}
                <p class="text-muted-foreground text-xs">{pendingReason}</p>
            {/if}
        </div>
        {#if !editing}
            <div class="flex flex-wrap items-center gap-2">
                <Tooltip>
                    <!-- `child` rather than the default trigger: bits-ui's trigger renders its own
                         <button>, and a <form> inside a button is invalid markup.

                         type="submit" comes AFTER the spread, deliberately. bits-ui defaults its
                         trigger to type="button" and merges that into these props, so spreading them
                         last would leave a button that opens a tooltip and never submits — a failure
                         nothing but clicking it would reveal. -->
                    <TooltipTrigger>
                        {#snippet child({ props })}
                            <form method="POST" action="?/reissue_link" use:enhance>
                                <Button {...props} type="submit" variant="outline" size="sm">
                                    <Mail class="size-4" />
                                    Email new link
                                </Button>
                            </form>
                        {/snippet}
                    </TooltipTrigger>
                    <!-- Written for an organiser, not an engineer. "Only a hash is stored" says
                         nothing to the person deciding whether to press this; what they need to know
                         is that it is safe and what the registrant ends up with. -->
                    <TooltipContent class="max-w-xs">
                        Emails them a new link for managing their own registration. We can't look up
                        the link they already have, so this makes a fresh one — their old link still
                        works for another week.
                    </TooltipContent>
                </Tooltip>
                {#if !isCancelled}
                    <!-- Outline rather than destructive: it sits beside the primary action an
                         organiser actually came here for, and the dialog behind it is where the
                         weight belongs. -->
                    <Button variant="outline" size="sm" onclick={() => (cancelDialogOpen = true)}>
                        <Ban class="size-4" />
                        Cancel registration
                    </Button>
                    <Button onclick={() => (editing = true)}>
                        <Pencil class="size-4" />
                        Edit registration
                    </Button>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Cancellation is the one status that changes what an organiser may DO here, so it keeps an
         alert. The rest is said once, by the badge.

         What it says about the money depends on whether any arrived. A checkout the payer abandoned
         is cancelled with no refund issued — _performCancellation returns without calling Stripe —
         and telling an organiser "the money has gone back" there sends them looking for a refund
         that does not exist, or worse, reassures a registrant who was never charged. -->
    {#if isCancelled}
        <Alert variant="destructive">
            <TriangleAlert class="size-4" />
            <AlertTitle>{money.wasCharged ? 'Cancelled and refunded' : 'Cancelled'}</AlertTitle>
            <AlertDescription>
                {#if money.wasCharged}
                    The money has gone back. This cannot be added to or reinstated — ask them to
                    register again.
                {:else}
                    Nothing was ever charged, so there was nothing to refund. This cannot be added
                    to or reinstated — ask them to register again.
                {/if}
            </AlertDescription>
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
                                    <Table.Head>Registration Tier</Table.Head>
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
                                            {#if includesCardFee(origins[index])}
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
                <RegistrationMoneyCard {money} status={data.registration.status} />
                {#if hasMixedPriceBasis}
                    <p class="text-muted-foreground mt-2 text-xs">
                        This party mixes online prices, which include the card processing fee, with
                        offline ones at the tier's face value. Each row records what that person
                        actually cost.
                    </p>
                {/if}
            </CardContent>
        </Card>

        <RegistrationHistory history={data.history} />
    {/if}
</section>

{#if !isCancelled}
    <AdminCancelDialog
        contactName={data.registration.contactName}
        paymentState={payment}
        totalCents={data.totalCents}
        memberCount={data.members.length}
        bind:open={cancelDialogOpen} />
{/if}
