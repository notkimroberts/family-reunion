<script lang="ts">
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { DatePicker } from '$lib/components'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
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
import { formatPrice, getAgeFromDate } from '$lib/utils'
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
    if (!newName.trim() || !newBirthDate) return
    const tier = getTierForBirthDate(newBirthDate)
    if (!tier) return
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

{#if data.events.length === 0}
    <div class="col-span-12">
        <Alert>
            <AlertDescription>
                No reunion events are currently open for registration. Check back later!
            </AlertDescription>
        </Alert>
    </div>
{:else}
    <div class="col-span-12 mb-2">
        <div class="flex items-center gap-2 text-sm">
            <span
                class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground line-through">
                1
            </span>
            <span class="text-muted-foreground line-through">Create account</span>
            <span class="text-muted-foreground">→</span>
            <span
                class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                2
            </span>
            <span class="font-medium">Register for event</span>
        </div>
    </div>

    <form method="POST" use:enhance class="col-span-12 contents">
        <input type="hidden" name="eventId" bind:value={$form.eventId} />
        <input type="hidden" name="selfBirthDate" bind:value={$form.selfBirthDate} />
        <input type="hidden" name="members" bind:value={$form.members} />

        <section class="col-span-12 xl:col-span-7">
            <Card>
                <CardHeader>
                    <CardTitle>Select Event</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <Field.Group>
                        <Field.Field>
                            <Field.Label for="eventId">Event</Field.Label>
                            <select
                                id="eventId"
                                class="border-input bg-background focus:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1"
                                bind:value={$form.eventId}>
                                <option value="">Select an event…</option>
                                {#each data.events as event}
                                    <option value={event.id}>{event.title} ({event.year})</option>
                                {/each}
                            </select>
                            {#if $errors.eventId?.[0]}
                                <Field.Error>{$errors.eventId[0]}</Field.Error>
                            {/if}
                        </Field.Field>
                    </Field.Group>

                    <Separator />

                    <div>
                        <h2 class="font-semibold mb-1">Party Members</h2>
                        <p class="text-sm text-muted-foreground mb-4">
                            Add everyone attending in your household.
                        </p>

                        <!-- Account holder row (locked) -->
                        <div class="rounded-lg border bg-muted/30 p-3 mb-3">
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

                        <!-- Add additional member row -->
                        <div
                            class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                            <Field.Group>
                                <Field.Field>
                                    <Field.Label for="memberName">Add member</Field.Label>
                                    <Input
                                        id="memberName"
                                        type="text"
                                        bind:value={newName}
                                        placeholder="Full name" />
                                </Field.Field>
                            </Field.Group>
                            <Field.Group>
                                <Field.Field>
                                    <Field.Label for="memberBirthDate">Birthday</Field.Label>
                                    <DatePicker
                                        id="memberBirthDate"
                                        bind:value={newBirthDate}
                                        placeholder="Pick a date" />
                                </Field.Field>
                            </Field.Group>
                            <Button type="button" size="sm" onclick={handleAddMember}>Add</Button>
                        </div>

                        {#if $errors.members?.[0]}
                            <p class="mt-2 text-sm text-destructive">{$errors.members[0]}</p>
                        {/if}

                        {#if members.length > 0}
                            <div class="mt-4 space-y-3 md:hidden">
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
                            <div class="hidden overflow-x-auto md:block mt-4">
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
                    </div>
                </CardContent>
            </Card>
        </section>

        <section class="col-span-12 xl:col-span-5 self-start">
            <Card>
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <h3 class="text-sm font-bold text-muted-foreground">Pricing Tiers</h3>
                        {#each data.tiers as tier}
                            <div class="flex items-center justify-between text-sm">
                                <span>
                                    {tier.label}
                                    <span class="text-muted-foreground">
                                        ({tier.minAge}{tier.maxAge ? `–${tier.maxAge}` : '+'})
                                    </span>
                                </span>
                                <span class="font-mono">${formatPrice(tier.priceCents)}</span>
                            </div>
                        {/each}
                    </div>

                    <Separator />

                    {#if canSubmit}
                        <div class="space-y-2">
                            <div class="flex items-center justify-between text-sm">
                                <span
                                    >{data.user.name}
                                    <span class="text-muted-foreground">(you)</span></span>
                                <span class="font-mono">${selfPrice}</span>
                            </div>
                            {#each members as member}
                                <div class="flex items-center justify-between text-sm">
                                    <span>{member.name}</span>
                                    <span class="font-mono">${getTierPrice(member.tierId)}</span>
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
        </section>
    </form>
{/if}
