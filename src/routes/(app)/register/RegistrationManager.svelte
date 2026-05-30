<script lang="ts">
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
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
import { getAge } from '$lib/utils/age'
import AddMemberForm from './AddMemberForm.svelte'
import CancelRegistrationDialog from './CancelRegistrationDialog.svelte'
import EditMemberDialog from './EditMemberDialog.svelte'
import RemoveMemberDialog from './RemoveMemberDialog.svelte'

type Member = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    shirtSize: string | null
    tierLabel: string
    priceCents: number
}

type Registration = {
    id: string
    status: string
    totalAmountCents: number
    stripeSessionId: string | null
}

type PricingTier = {
    id: string
    label: string
    priceCents: number
    minAge: number
    maxAge: number | null
}

type ReunionEvent = { id: string; title: string; shirtsEnabled: boolean }

let {
    registration,
    members: initialMembers,
    tiers,
    event,
}: {
    registration: Registration
    members: Member[]
    tiers: PricingTier[]
    event: ReunionEvent
} = $props()

let members = $derived(initialMembers)
let showAddForm = $state(false)
let editingMember = $state<Member | null>(null)
let editDialogOpen = $state(false)
let removingMember = $state<Member | null>(null)
let removeDialogOpen = $state(false)
let cancelDialogOpen = $state(false)

function handleEditClick(member: Member) {
    editingMember = member
    editDialogOpen = true
}

function handleRemoveClick(member: Member) {
    removingMember = member
    removeDialogOpen = true
}
</script>

<!-- Summary card -->
<div class="col-span-12">
    <Card>
        <CardContent class="pt-6 pb-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="text-xl font-bold">{event.title}</h2>
                    <p class="text-muted-foreground text-sm mt-0.5">
                        Total paid: <span class="font-medium text-foreground">
                            ${formatPrice(registration.totalAmountCents)}
                        </span>
                    </p>
                </div>
                <Badge variant={registration.status === 'paid' ? 'default' : 'secondary'}>
                    {registration.status}
                </Badge>
            </div>
        </CardContent>
    </Card>
</div>

<!-- Party members card -->
<div class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Party Members</CardTitle>
        </CardHeader>
        <CardContent>
            <!-- Mobile cards -->
            <div class="space-y-3 md:hidden">
                {#each members as member (member.id)}
                    <div class="rounded-lg border p-4">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="font-medium truncate">{member.name}</p>
                                <p class="text-muted-foreground text-sm">
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
                                <p class="text-sm font-mono mt-0.5">
                                    ${formatPrice(member.priceCents)}
                                </p>
                            </div>
                            <div class="flex gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onclick={() => handleEditClick(member)}>Edit</Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
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
                            <TableHead>Category</TableHead>
                            {#if event.shirtsEnabled}
                                <TableHead>T-Shirt</TableHead>
                            {/if}
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
                                {#if event.shirtsEnabled}
                                    <TableCell>{member.shirtSize || '—'}</TableCell>
                                {/if}
                                <TableCell class="font-mono"
                                    >${formatPrice(member.priceCents)}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onclick={() => handleEditClick(member)}>Edit</Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onclick={() => handleRemoveClick(member)}
                                            >Remove</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
</div>

<!-- Add member form -->
{#if showAddForm}
    <div class="col-span-12">
        <AddMemberForm
            registrationId={registration.id}
            {tiers}
            shirtsEnabled={event.shirtsEnabled}
            onCancel={() => (showAddForm = false)} />
    </div>
{:else}
    <div class="col-span-12 flex flex-wrap gap-3 justify-between">
        <Button onclick={() => (showAddForm = true)}>Add a Member</Button>
        <Button variant="destructive" onclick={() => (cancelDialogOpen = true)}>
            Cancel Registration
        </Button>
    </div>
{/if}

{#if editingMember}
    <EditMemberDialog
        member={editingMember}
        shirtsEnabled={event.shirtsEnabled}
        bind:open={editDialogOpen} />
{/if}

{#if removingMember}
    <RemoveMemberDialog member={removingMember} bind:open={removeDialogOpen} />
{/if}

<CancelRegistrationDialog registrationId={registration.id} bind:open={cancelDialogOpen} />
