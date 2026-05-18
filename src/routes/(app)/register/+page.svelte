<script lang="ts">
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { DatePicker } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { APP_NAME } from '$lib/general/constants'
import { formatPrice, getAgeFromDate, getInitials } from '$lib/utils'
import { registrationSchema } from './schema'

let { data } = $props()

const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(registrationSchema),
    dataType: 'form',
})

let selfBirthDate = $state(data.profile?.birthDate ?? undefined)

$effect(() => {
    $form.selfBirthDate = selfBirthDate ?? ''
})

let members = $state<{ name: string; birthDate: string; tierId: string }[]>([])
let newName = $state('')
let newBirthDate = $state<string | undefined>(undefined)

$effect(() => {
    $form.members = JSON.stringify(members)
})

let tierMap = $derived(new Map(data.tiers.map((t) => [t.id, t])))

function getTierForBirthDate(birthDate: string) {
    const age = getAgeFromDate(birthDate)
    return data.tiers.find((t) => age >= t.minAge && (t.maxAge === null || age <= t.maxAge))
}

let selfTier = $derived(selfBirthDate ? getTierForBirthDate(selfBirthDate) : undefined)

function handleAddMember() {
    if (!newName.trim() || !newBirthDate) {
        return
    }
    const tier = getTierForBirthDate(newBirthDate)
    if (!tier) {
        return
    }
    members = [...members, { name: newName.trim(), birthDate: newBirthDate, tierId: tier.id }]
    newName = ''
    newBirthDate = undefined
}

function handleRemoveMember(index: number) {
    members = members.filter((_, i) => i !== index)
}

function getTierLabel(tierId: string) {
    return tierMap.get(tierId)?.label ?? ''
}

function getTierPrice(tierId: string) {
    const tier = tierMap.get(tierId)
    return tier ? formatPrice(tier.priceCents) : '0.00'
}

let selfPrice = $derived(selfTier ? formatPrice(selfTier.priceCents) : null)

let total = $derived(
    (selfTier?.priceCents ?? 0) +
        members.reduce((sum, m) => {
            const tier = tierMap.get(m.tierId)
            return sum + (tier?.priceCents ?? 0)
        }, 0),
)

let canSubmit = $derived(!!selfBirthDate && !!selfTier)
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
{:else}
    <!-- Event hero header -->
    <section class="col-span-12">
        <div class="rounded-xl border bg-card px-6 py-8 text-center">
            <p class="text-4xl mb-3">🎉</p>
            <h1 class="text-3xl font-bold">{data.event.title}</h1>
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
                Hi, <span class="font-medium text-foreground">{data.user.name}</span>! Complete the
                form below to register your party.
            </p>
        </div>
    </section>

    <!-- Pricing tiers (subtle, for reference) -->
    {#if data.tiers.length > 0}
        <section class="col-span-12">
            <div class="flex flex-wrap gap-2 justify-center">
                {#each data.tiers as tier}
                    <span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        {tier.label}
                        ({tier.minAge}{tier.maxAge ? `–${tier.maxAge}` : '+'}) · ${formatPrice(
                            tier.priceCents,
                        )}
                    </span>
                {/each}
            </div>
        </section>
    {/if}

    <form method="POST" use:enhance class="col-span-12">
        <input type="hidden" name="eventId" bind:value={$form.eventId} />
        <input type="hidden" name="selfBirthDate" bind:value={$form.selfBirthDate} />
        <input type="hidden" name="members" bind:value={$form.members} />

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
            <!-- Left column -->
            <div class="flex flex-col gap-6">
                <!-- Party members -->
                <Card>
                    <CardHeader>
                        <CardTitle>Your Party</CardTitle>
                        <CardDescription>Add everyone attending in your household.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <!-- Account holder row (locked) -->
                        <div class="rounded-lg border bg-muted/30 p-3">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="font-medium text-sm">{data.user.name}</span>
                                    <Badge variant="secondary" class="text-xs">You</Badge>
                                </div>
                                {#if selfPrice}
                                    <span class="text-sm font-medium">${selfPrice}</span>
                                {/if}
                            </div>
                            <div class="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-end">
                                <Field.Group>
                                    <Field.Field>
                                        <Field.Label for="selfBirthDate" class="text-xs">
                                            Birthday
                                        </Field.Label>
                                        <DatePicker
                                            id="selfBirthDate"
                                            bind:value={selfBirthDate}
                                            placeholder="Your birthday" />
                                    </Field.Field>
                                </Field.Group>
                                {#if selfTier}
                                    <p class="text-sm text-muted-foreground pb-1">
                                        Age {getAgeFromDate(selfBirthDate!)} · {selfTier.label}
                                    </p>
                                {/if}
                            </div>
                            {#if $errors.selfBirthDate?.[0]}
                                <p class="mt-1 text-xs text-destructive">
                                    {$errors.selfBirthDate[0]}
                                </p>
                            {/if}
                        </div>

                        <Separator />

                        <!-- Add additional member -->
                        <div class="space-y-2">
                            <label for="memberName" class="text-sm font-medium">Add member</label>
                            <Input
                                id="memberName"
                                type="text"
                                bind:value={newName}
                                placeholder="Full name" />
                            <div class="flex gap-2 items-end">
                                <div class="flex-1">
                                    <DatePicker
                                        id="memberBirthDate"
                                        bind:value={newBirthDate}
                                        placeholder="Birthday" />
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    class="shrink-0"
                                    onclick={handleAddMember}>
                                    Add
                                </Button>
                            </div>
                        </div>

                        {#if $errors.members?.[0]}
                            <p class="text-sm text-destructive">{$errors.members[0]}</p>
                        {/if}

                        {#if members.length > 0}
                            <div class="space-y-3 md:hidden">
                                {#each members as member, i}
                                    <div class="rounded-lg border p-3">
                                        <div class="flex items-center justify-between">
                                            <span class="font-medium">{member.name}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                class="text-destructive hover:text-destructive h-6 px-2"
                                                onclick={() => handleRemoveMember(i)}>✕</Button>
                                        </div>
                                        <div class="mt-1 flex gap-4 text-sm text-muted-foreground">
                                            <span>Age {getAgeFromDate(member.birthDate)}</span>
                                            <span>{getTierLabel(member.tierId)}</span>
                                            <span class="ml-auto font-medium text-foreground">
                                                ${getTierPrice(member.tierId)}
                                            </span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                            <div class="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Age</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {#each members as member, i}
                                            <TableRow>
                                                <TableCell>{member.name}</TableCell>
                                                <TableCell
                                                    >{getAgeFromDate(member.birthDate)}</TableCell>
                                                <TableCell>{getTierLabel(member.tierId)}</TableCell>
                                                <TableCell
                                                    >${getTierPrice(member.tierId)}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        class="text-destructive hover:text-destructive h-6 px-2"
                                                        onclick={() => handleRemoveMember(i)}
                                                        >✕</Button>
                                                </TableCell>
                                            </TableRow>
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
                        <CardDescription
                            >Pricing is based on age at time of the event.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        {#if canSubmit}
                            <div class="space-y-2">
                                <div class="flex items-center justify-between text-sm">
                                    <span>
                                        {data.user.name}
                                        <span class="text-muted-foreground">(you)</span>
                                    </span>
                                    <span class="font-mono">${selfPrice}</span>
                                </div>
                                {#each members as member}
                                    <div class="flex items-center justify-between text-sm">
                                        <span>{member.name}</span>
                                        <span class="font-mono"
                                            >${getTierPrice(member.tierId)}</span>
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
                                Enter your birthday to see your total.
                            </p>
                        {/if}
                    </CardContent>
                </Card>
            </div>
        </div>
        <!-- end grid -->
    </form>
{/if}
