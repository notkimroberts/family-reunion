<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { DatePicker } from '$lib/components'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Select from '$lib/components/ui/select'
import { Separator } from '$lib/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { APP_NAME, SHIRT_SIZES } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import { formatBirthDate } from '$lib/utils/age'
import MemberFormFields from './MemberFormFields.svelte'
import RegistrationManager from './RegistrationManager.svelte'
import { getDefaultTierId, getTierLabel, getTierPrice, getMemberAge } from './pricingUtils'
import { registrationSchema } from './schema'
import type { FormMember } from './types'

let { data } = $props()

const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(registrationSchema),
    dataType: 'form',
})

onMount(() => {
    if (data.memberAdded) {
        toast.success('Member added successfully!')
    }
})

const tiers = data.tiers
const tierMap = new Map(tiers.map((t) => [t.id, t]))

let selfTierId = $state(getDefaultTierId(tiers, data.profile?.birthYear))
let selfBirthDate = $state(
    formatBirthDate(data.profile?.birthYear, data.profile?.birthMonth, data.profile?.birthDay),
)
let selfShirtSize = $state('')

$effect(() => {
    $form.selfTierId = selfTierId
})
$effect(() => {
    $form.selfBirthDate = selfBirthDate ?? ''
})
$effect(() => {
    $form.selfShirtSize = selfShirtSize
})

let members = $state<FormMember[]>([])
let newName = $state('')
let newTierId = $state('')
let newBirthDate = $state<string | undefined>(undefined)
let newShirtSize = $state('')

$effect(() => {
    $form.members = JSON.stringify(members)
})

let editIndex = $state<number | undefined>(undefined)
let editName = $state('')
let editTierId = $state('')
let editBirthDate = $state<string | undefined>(undefined)
let editShirtSize = $state('')

function handleAddMember() {
    if (!newName.trim() || !newTierId) {
        return
    }
    members = [
        ...members,
        {
            name: newName.trim(),
            tierId: newTierId,
            birthDate: newBirthDate,
            shirtSize: newShirtSize || undefined,
        },
    ]
    newName = ''
    newTierId = ''
    newBirthDate = undefined
    newShirtSize = ''
}

function handleRemoveMember(index: number) {
    if (editIndex === index) {
        editIndex = undefined
    }
    members = members.filter((_, i) => i !== index)
}

function handleEditStart(index: number) {
    const member = members[index]
    editIndex = index
    editName = member.name
    editTierId = member.tierId
    editBirthDate = member.birthDate
    editShirtSize = member.shirtSize ?? ''
}

function handleEditSave() {
    if (editIndex === undefined || !editName.trim() || !editTierId) {
        return
    }
    members = members.map((m, i) =>
        i === editIndex
            ? {
                  name: editName.trim(),
                  tierId: editTierId,
                  birthDate: editBirthDate,
                  shirtSize: editShirtSize || undefined,
              }
            : m,
    )
    editIndex = undefined
}

function handleEditCancel() {
    editIndex = undefined
}

let selfTier = $derived(selfTierId ? tierMap.get(selfTierId) : undefined)
let total = $derived(
    (selfTier?.priceCents ?? 0) +
        members.reduce((sum, m) => sum + (tierMap.get(m.tierId)?.priceCents ?? 0), 0),
)
let canSubmit = $derived(!!selfTierId)
let tableColCount = $derived(data.event?.shirtsEnabled ? 6 : 5)
</script>

<svelte:head>
    <title>Register — {APP_NAME}</title>
</svelte:head>

{#if !data.event}
    <div class="col-span-12">
        <div class="rounded-xl border bg-card px-6 py-12 text-center">
            <p class="text-4xl mb-3">😢</p>
            <p class="text-lg font-semibold">No reunion events are open right now.</p>
            <p class="text-muted-foreground text-sm mt-1">Check back soon!</p>
        </div>
    </div>
{:else if data.existingRegistration}
    <RegistrationManager
        registration={data.existingRegistration}
        members={data.members}
        tiers={data.tiers}
        event={data.event} />
{:else}
    <!-- Event hero header -->
    <section class="col-span-12">
        {#if data.registrationCancelled}
            <Alert class="mb-4" variant="destructive">
                <AlertTitle>Registration cancelled</AlertTitle>
                <AlertDescription>
                    Your registration has been cancelled and a refund is on its way. Fill out the
                    form below to register again.
                </AlertDescription>
            </Alert>
        {/if}
        <div class="rounded-xl border bg-card px-6 py-8 text-center">
            <p class="text-4xl mb-3">🎉</p>
            <h1>{data.event.title}</h1>
            <p class="text-muted-foreground mt-1 text-lg">{data.event.year} Reunion</p>
            {#if data.event.startDate}
                <p class="text-sm text-muted-foreground mt-2">
                    {new Date(data.event.startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                    {#if data.event.endDate}
                        – {new Date(data.event.endDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    {/if}
                </p>
            {/if}
            <p class="mt-4 text-sm text-muted-foreground">
                Hi, <span class="font-medium text-foreground">{data.user.name}</span>! Add everyone
                in your party below to register.
            </p>
        </div>
    </section>

    <form method="POST" action="?/register" use:enhance class="col-span-12">
        <input type="hidden" name="eventId" bind:value={$form.eventId} />
        <input type="hidden" name="selfTierId" bind:value={$form.selfTierId} />
        <input type="hidden" name="selfBirthDate" bind:value={$form.selfBirthDate} />
        <input type="hidden" name="selfShirtSize" bind:value={$form.selfShirtSize} />
        <input type="hidden" name="members" bind:value={$form.members} />

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
            <!-- Left column -->
            <div class="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Party</CardTitle>
                        <CardDescription>Add everyone attending in your household.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <!-- Account holder row (locked) -->
                        <div class="space-y-2">
                            <div
                                class="grid grid-cols-1 gap-2 sm:grid-cols-2 {data.event
                                    .shirtsEnabled
                                    ? 'lg:grid-cols-4'
                                    : 'lg:grid-cols-3'}">
                                <div class="space-y-1">
                                    <p class="text-xs font-medium">Name</p>
                                    <div
                                        class="flex h-9 items-center gap-1.5 rounded-md border border-input bg-muted/50 px-3 text-sm">
                                        <span class="truncate">{data.user.name}</span>
                                        <Badge variant="secondary" class="text-xs shrink-0"
                                            >You</Badge>
                                    </div>
                                </div>
                                <div class="space-y-1">
                                    <label for="selfTier" class="text-xs font-medium">
                                        Category <span class="text-destructive">*</span>
                                    </label>
                                    <Select.Root
                                        type="single"
                                        value={selfTierId}
                                        onValueChange={(v) => (selfTierId = v)}>
                                        <Select.Trigger id="selfTier">
                                            <BitsSelect.Value placeholder="Select category…" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each data.tiers as tier}
                                                <Select.Item
                                                    value={tier.id}
                                                    label="{tier.label} — ${formatPrice(
                                                        tier.priceCents,
                                                    )}" />
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                                <div class="space-y-1">
                                    <label for="selfBirthDate" class="text-xs font-medium">
                                        Birthday <span class="text-muted-foreground/70 font-normal"
                                            >(optional)</span>
                                    </label>
                                    <DatePicker
                                        id="selfBirthDate"
                                        bind:value={selfBirthDate}
                                        placeholder="Your birthday" />
                                </div>
                                {#if data.event.shirtsEnabled}
                                    <div class="space-y-1">
                                        <label for="selfShirtSize" class="text-xs font-medium">
                                            T-shirt size <span
                                                class="text-muted-foreground/70 font-normal"
                                                >(optional)</span>
                                        </label>
                                        <Select.Root
                                            type="single"
                                            value={selfShirtSize}
                                            onValueChange={(v) => (selfShirtSize = v)}>
                                            <Select.Trigger id="selfShirtSize">
                                                <BitsSelect.Value placeholder="Select size…" />
                                            </Select.Trigger>
                                            <Select.Content>
                                                {#each SHIRT_SIZES as size}
                                                    <Select.Item value={size} label={size} />
                                                {/each}
                                            </Select.Content>
                                        </Select.Root>
                                    </div>
                                {/if}
                            </div>
                            {#if $errors.selfTierId?.[0]}
                                <p class="text-xs text-destructive">{$errors.selfTierId[0]}</p>
                            {/if}
                        </div>

                        <Separator />

                        <!-- Add a guest -->
                        <div class="space-y-2">
                            <p class="text-sm font-medium">Add a guest</p>
                            <MemberFormFields
                                bind:name={newName}
                                bind:tierId={newTierId}
                                bind:birthDate={newBirthDate}
                                bind:shirtSize={newShirtSize}
                                {tiers}
                                shirtsEnabled={data.event.shirtsEnabled}
                                idPrefix="new-member" />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onclick={handleAddMember}>
                                + Add
                            </Button>
                        </div>

                        {#if $errors.members?.[0]}
                            <p class="text-sm text-destructive">{$errors.members[0]}</p>
                        {/if}

                        {#if members.length > 0}
                            <!-- Mobile cards -->
                            <div class="space-y-3 md:hidden">
                                {#each members as member, i}
                                    <div class="rounded-lg border p-3">
                                        {#if editIndex === i}
                                            <div class="space-y-2">
                                                <MemberFormFields
                                                    bind:name={editName}
                                                    bind:tierId={editTierId}
                                                    bind:birthDate={editBirthDate}
                                                    bind:shirtSize={editShirtSize}
                                                    {tiers}
                                                    shirtsEnabled={data.event.shirtsEnabled}
                                                    idPrefix="edit-mob" />
                                                <div class="flex gap-2 pt-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onclick={handleEditSave}>Save</Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onclick={handleEditCancel}>Cancel</Button>
                                                </div>
                                            </div>
                                        {:else}
                                            <div class="flex items-center justify-between">
                                                <span class="font-medium">{member.name}</span>
                                                <div class="flex gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        class="h-6 px-2 text-xs"
                                                        onclick={() => handleEditStart(i)}
                                                        >Edit</Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        class="text-destructive hover:text-destructive h-6 px-2"
                                                        onclick={() => handleRemoveMember(i)}
                                                        >✕</Button>
                                                </div>
                                            </div>
                                            <div
                                                class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                                                {#if member.birthDate}
                                                    <span
                                                        >Age {getMemberAge(member.birthDate)}</span>
                                                {/if}
                                                <span>{getTierLabel(tierMap, member.tierId)}</span>
                                                {#if data.event.shirtsEnabled && member.shirtSize}
                                                    <span>Size {member.shirtSize}</span>
                                                {/if}
                                                <span class="ml-auto font-medium text-foreground"
                                                    >${getTierPrice(tierMap, member.tierId)}</span>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>

                            <!-- Desktop table -->
                            <div class="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Age</TableHead>
                                            <TableHead>Category</TableHead>
                                            {#if data.event.shirtsEnabled}
                                                <TableHead>T-shirt</TableHead>
                                            {/if}
                                            <TableHead>Price</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {#each members as member, i}
                                            {#if editIndex === i}
                                                <TableRow class="bg-muted/20">
                                                    <TableCell colspan={tableColCount} class="p-3">
                                                        <MemberFormFields
                                                            bind:name={editName}
                                                            bind:tierId={editTierId}
                                                            bind:birthDate={editBirthDate}
                                                            bind:shirtSize={editShirtSize}
                                                            {tiers}
                                                            shirtsEnabled={data.event.shirtsEnabled}
                                                            idPrefix="edit-desk"
                                                            compact />
                                                        <div class="flex gap-2 mt-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onclick={handleEditSave}
                                                                >Save</Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onclick={handleEditCancel}
                                                                >Cancel</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            {:else}
                                                <TableRow>
                                                    <TableCell>{member.name}</TableCell>
                                                    <TableCell>
                                                        {member.birthDate
                                                            ? getMemberAge(member.birthDate)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell
                                                        >{getTierLabel(
                                                            tierMap,
                                                            member.tierId,
                                                        )}</TableCell>
                                                    {#if data.event.shirtsEnabled}
                                                        <TableCell
                                                            >{member.shirtSize || '—'}</TableCell>
                                                    {/if}
                                                    <TableCell
                                                        >${getTierPrice(
                                                            tierMap,
                                                            member.tierId,
                                                        )}</TableCell>
                                                    <TableCell>
                                                        <div class="flex gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                class="h-6 px-2 text-xs"
                                                                onclick={() => handleEditStart(i)}
                                                                >Edit</Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                class="text-destructive hover:text-destructive h-6 px-2"
                                                                onclick={() =>
                                                                    handleRemoveMember(i)}
                                                                >✕</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            {/if}
                                        {/each}
                                    </TableBody>
                                </Table>
                            </div>
                        {/if}
                    </CardContent>
                </Card>
            </div>

            <!-- Right column: order summary -->
            <div class="self-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>Complete your registration below.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        {#if canSubmit}
                            <div class="space-y-2">
                                <div class="flex items-center justify-between text-sm">
                                    <span>
                                        {data.user.name}
                                        <span class="text-muted-foreground">(you)</span>
                                    </span>
                                    <span class="font-mono"
                                        >{selfTier
                                            ? `$${formatPrice(selfTier.priceCents)}`
                                            : ''}</span>
                                </div>
                                {#each members as member}
                                    <div class="flex items-center justify-between text-sm">
                                        <span>{member.name}</span>
                                        <span class="font-mono"
                                            >${getTierPrice(tierMap, member.tierId)}</span>
                                    </div>
                                {/each}
                            </div>
                            <Separator />
                            <div class="flex items-center justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${formatPrice(total)}</span>
                            </div>
                            <Button type="submit" class="w-full mt-2">
                                Pay ${formatPrice(total)} & Register
                            </Button>
                        {:else}
                            <p class="text-sm text-muted-foreground text-center py-4">
                                Select your category to see your total.
                            </p>
                        {/if}
                    </CardContent>
                </Card>
            </div>
        </div>
    </form>
{/if}
