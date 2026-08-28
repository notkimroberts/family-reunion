<script lang="ts">
import { CheckCircle2 } from '@lucide/svelte'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { formatPrice } from '$lib/utils'
import { getAge } from '$lib/utils/age'
import AddMemberForm from './AddMemberForm.svelte'
import CancelRegistrationDialog from './CancelRegistrationDialog.svelte'
import EditMemberDialog from './EditMemberDialog.svelte'
import RemoveMemberDialog from './RemoveMemberDialog.svelte'
import type { EventDetails, PartyMember, RegistrationDetails, TierOption } from './types'

let {
    token,
    registration,
    members: initialMembers,
    event,
    tiers,
}: {
    token: string
    registration: RegistrationDetails
    members: PartyMember[]
    event: EventDetails
    tiers: TierOption[]
} = $props()

let members = $derived(initialMembers)
let totalCents = $derived(members.reduce((sum, m) => sum + m.priceCents, 0))
/* addMember rejects any status other than paid/waived (addMember.ts:34), so offering the
   button on a payment-outstanding registration would hand the registrant a 409. They can
   still edit details and cancel — only paying to add someone is unavailable until the
   organisers record their payment. */
let canAddMembers = $derived(registration.status === 'paid' || registration.status === 'waived')
let isLocked = $derived(
    event.registrationLockDate !== null && new Date(event.registrationLockDate) < new Date(),
)
let showAddForm = $state(false)
let editingMember = $state<PartyMember | null>(null)
let editDialogOpen = $state(false)
let removingMember = $state<PartyMember | null>(null)
let removeDialogOpen = $state(false)
let cancelDialogOpen = $state(false)

function handleEditClick(member: PartyMember) {
    editingMember = member
    editDialogOpen = true
}

function handleRemoveClick(member: PartyMember) {
    removingMember = member
    removeDialogOpen = true
}
</script>

<!-- Success banner -->
<div class="col-span-12">
    <div
        class="rounded-xl border bg-card px-6 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
            <CheckCircle2 class="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
            <div>
                <p class="font-semibold">{event.title}</p>
                <p class="text-sm text-muted-foreground mt-0.5">
                    {members.length}
                    {members.length === 1 ? 'person' : 'people'} registered ·
                    <span class="text-foreground font-medium">
                        ${formatPrice(totalCents)} paid
                    </span>
                </p>
            </div>
        </div>
        <Badge
            variant={registration.status === 'paid' ? 'default' : 'secondary'}
            class="self-start sm:self-auto capitalize">
            {registration.status}
        </Badge>
    </div>
</div>

<!-- Party members card -->
<div class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Your Party</CardTitle>
        </CardHeader>
        <CardContent>
            <!-- Mobile cards -->
            <div class="space-y-3 md:hidden">
                {#each members as member (member.id)}
                    <div class="rounded-lg border px-4 py-3">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="font-medium">{member.name}</p>
                                <p class="text-muted-foreground text-sm mt-0.5">
                                    {member.tierLabel}
                                    {#if member.birthYear}
                                        · Age {getAge(
                                            member.birthYear,
                                            member.birthMonth,
                                            member.birthDay,
                                        )}
                                    {/if}
                                    {#if member.shirtSize}
                                        · {member.shirtSize}
                                    {/if}
                                </p>
                                <p class="text-sm tabular-nums mt-0.5">
                                    ${formatPrice(member.priceCents)}
                                </p>
                            </div>
                            <div class="flex gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isLocked}
                                    onclick={() => handleEditClick(member)}>Edit</Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isLocked}
                                    onclick={() => handleRemoveClick(member)}>Remove</Button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Desktop table -->
            <div class="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>T-Shirt</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {#each members as member (member.id)}
                            <TableRow>
                                <TableCell class="font-medium">{member.name}</TableCell>
                                <TableCell>
                                    {member.birthYear
                                        ? getAge(
                                              member.birthYear,
                                              member.birthMonth,
                                              member.birthDay,
                                          )
                                        : '—'}
                                </TableCell>
                                <TableCell>{member.tierLabel}</TableCell>
                                <TableCell>{member.shirtSize || '—'}</TableCell>
                                <TableCell class="tabular-nums"
                                    >${formatPrice(member.priceCents)}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isLocked}
                                            onclick={() => handleEditClick(member)}>Edit</Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={isLocked}
                                            onclick={() => handleRemoveClick(member)}
                                            >Remove</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>

            <Separator class="my-4" />

            <div class="flex items-center justify-between">
                <p class="text-sm font-medium">
                    Total paid:
                    <span class="tabular-nums">${formatPrice(totalCents)}</span>
                </p>
            </div>
        </CardContent>
    </Card>
</div>

<!-- Actions -->
{#if isLocked}
    <div class="col-span-12">
        <p class="text-sm text-muted-foreground rounded-lg border bg-card px-4 py-3">
            Registration changes are closed for this event.
        </p>
    </div>
{:else if showAddForm}
    <div class="col-span-12">
        <AddMemberForm
            {token}
            registrationId={registration.id}
            {tiers}
            onCancel={() => (showAddForm = false)} />
    </div>
{:else}
    <div class="col-span-12 flex flex-wrap gap-3 justify-between">
        {#if canAddMembers}
            <Button onclick={() => (showAddForm = true)}>Add a Member</Button>
        {:else}
            <p class="text-sm text-muted-foreground self-center">
                Adding members is available once your payment is recorded.
            </p>
        {/if}
        <Button
            variant="outline"
            class="text-destructive border-destructive hover:bg-destructive/10"
            onclick={() => (cancelDialogOpen = true)}>
            Cancel Registration
        </Button>
    </div>
{/if}

{#if editingMember}
    {#key editingMember.id}
        <EditMemberDialog {token} member={editingMember} bind:open={editDialogOpen} />
    {/key}
{/if}

{#if removingMember}
    {#key removingMember.id}
        <RemoveMemberDialog {token} member={removingMember} bind:open={removeDialogOpen} />
    {/key}
{/if}

<CancelRegistrationDialog {token} registrationId={registration.id} bind:open={cancelDialogOpen} />
