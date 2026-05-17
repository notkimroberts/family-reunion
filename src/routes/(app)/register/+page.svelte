<script lang="ts">
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
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
import { formatPrice, getAge } from '$lib/utils'
import { registrationSchema } from './schema'

let { data } = $props()

const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(registrationSchema),
    dataType: 'form',
})

let members = $state<
    {
        name: string
        birthYear: number
        birthMonth: number | null
        birthDay: number | null
        tierId: string
    }[]
>([])
let newName = $state('')
let newBirthYear = $state(2000)
let newBirthMonth = $state<number | null>(null)
let newBirthDay = $state<number | null>(null)

$effect(() => {
    $form.members = JSON.stringify(members)
})

let tierMap = $derived(new Map(data.tiers.map((t) => [t.id, t])))

function getTierForAge(age: number) {
    return data.tiers.find((t) => age >= t.minAge && (t.maxAge === null || age <= t.maxAge))
}

function handleAddMember() {
    if (!newName.trim() || !newBirthYear) {
        return
    }
    const age = getAge(newBirthYear, newBirthMonth, newBirthDay)
    const tier = getTierForAge(age)
    if (!tier) {
        return
    }
    members = [
        ...members,
        {
            name: newName.trim(),
            birthYear: newBirthYear,
            birthMonth: newBirthMonth,
            birthDay: newBirthDay,
            tierId: tier.id,
        },
    ]
    newName = ''
    newBirthYear = 2000
    newBirthMonth = null
    newBirthDay = null
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

let total = $derived(
    members.reduce((sum, m) => {
        const tier = tierMap.get(m.tierId)
        return sum + (tier?.priceCents ?? 0)
    }, 0),
)
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

                        <div
                            class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
                            <Field.Group>
                                <Field.Field>
                                    <Field.Label for="memberName">Name</Field.Label>
                                    <Input
                                        id="memberName"
                                        type="text"
                                        bind:value={newName}
                                        placeholder="Full name" />
                                </Field.Field>
                            </Field.Group>
                            <Field.Group>
                                <Field.Field>
                                    <Field.Label for="memberBirthYear">Birth Year</Field.Label>
                                    <Input
                                        id="memberBirthYear"
                                        type="number"
                                        bind:value={newBirthYear}
                                        min="1900"
                                        max={new Date().getFullYear()} />
                                </Field.Field>
                            </Field.Group>
                            <Field.Group>
                                <Field.Field>
                                    <Field.Label for="memberBirthMonth">Month</Field.Label>
                                    <select
                                        id="memberBirthMonth"
                                        class="border rounded-md px-3 py-2 text-sm bg-background h-9 w-full"
                                        bind:value={newBirthMonth}>
                                        <option value={null}>—</option>
                                        {#each Array.from({ length: 12 }, (_, i) => i + 1) as m}
                                            <option value={m}
                                                >{new Date(2000, m - 1).toLocaleString('default', {
                                                    month: 'short',
                                                })}</option>
                                        {/each}
                                    </select>
                                </Field.Field>
                            </Field.Group>
                            <Field.Group>
                                <Field.Field>
                                    <Field.Label for="memberBirthDay">Day</Field.Label>
                                    <Input
                                        id="memberBirthDay"
                                        type="number"
                                        bind:value={newBirthDay}
                                        min="1"
                                        max="31"
                                        placeholder="—" />
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
                                            <span
                                                >Age {getAge(
                                                    member.birthYear,
                                                    member.birthMonth,
                                                    member.birthDay,
                                                )}</span>
                                            <span>{getTierLabel(member.tierId)}</span>
                                            <span class="ml-auto font-medium text-foreground"
                                                >${getTierPrice(member.tierId)}</span>
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
                                                    >{getAge(
                                                        member.birthYear,
                                                        member.birthMonth,
                                                        member.birthDay,
                                                    )}</TableCell>
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
                                    <span class="text-muted-foreground"
                                        >({tier.minAge}{tier.maxAge
                                            ? `–${tier.maxAge}`
                                            : '+'})</span>
                                </span>
                                <span class="font-mono">${formatPrice(tier.priceCents)}</span>
                            </div>
                        {/each}
                    </div>

                    <Separator />

                    {#if members.length > 0}
                        <div class="space-y-2">
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
                            Add party members to see your total.
                        </p>
                    {/if}
                </CardContent>
            </Card>
        </section>
    </form>
{/if}
