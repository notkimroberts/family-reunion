<script lang="ts">
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { SHIRT_SIZES } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'

const selectClass =
    'border-input bg-background focus:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1'

let { data, form } = $props()

type Member = {
    name: string
    birthDate: string | undefined
    tierId: string
    shirtSize: string
}

const defaultMember = (): Member => ({ name: '', birthDate: undefined, tierId: '', shirtSize: '' })

let contactName = $state('')
let contactEmail = $state('')
let status = $state<'paid' | 'pending' | 'waived'>('paid')
let members = $state<Member[]>([defaultMember()])
let submitted = $state(false)

let membersJson = $derived(
    JSON.stringify(
        members.map((m) => ({
            name: m.name,
            birthDate: m.birthDate ?? '',
            tierId: m.tierId,
            shirtSize: m.shirtSize || undefined,
        })),
    ),
)

let totalCents = $derived(
    members.reduce((sum, m) => {
        const tier = data.tiers.find((t) => t.id === m.tierId)
        return sum + (tier?.priceCents ?? 0)
    }, 0),
)

function addMember() {
    members = [...members, defaultMember()]
}

function removeMember(index: number) {
    members = members.filter((_, i) => i !== index)
}

function handleSuccess() {
    contactName = ''
    contactEmail = ''
    status = 'paid'
    members = [defaultMember()]
    submitted = true
    setTimeout(() => (submitted = false), 3000)
}

const shirtsEnabled = $derived(data.events[0]?.shirtsEnabled ?? false)
</script>

<svelte:head>
    <title>Add Registration — Admin</title>
</svelte:head>

<section class="col-span-12">
    <div class="mb-6">
        <a href="/admin" class="text-sm text-muted-foreground hover:text-foreground">← Admin</a>
        <h1 class="text-2xl font-bold mt-1">Add Paper Registration</h1>
        <p class="text-muted-foreground text-sm mt-1">
            Manually register someone who submitted on paper.
        </p>
    </div>

    {#if data.events.length === 0}
        <Card>
            <CardContent class="pt-6">
                <p class="text-muted-foreground">No open events. Open an event first.</p>
                <Button href="/admin/events" variant="outline" class="mt-4">Manage Events</Button>
            </CardContent>
        </Card>
    {:else}
        {#if submitted || form?.success}
            <div
                class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                Registration added successfully.
            </div>
        {/if}

        {#if form?.error}
            <div
                class="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {form.error}
            </div>
        {/if}

        <form
            method="POST"
            use:enhance={() => {
                return ({ result, update }) => {
                    if (result.type === 'success') {
                        handleSuccess()
                    }
                    update({ reset: false })
                }
            }}
            class="space-y-6 max-w-2xl">
            <input type="hidden" name="eventId" value={data.events[0].id} />
            <input type="hidden" name="members" value={membersJson} />

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Contact Info</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="space-y-2">
                            <label for="contactName" class="text-sm font-medium">
                                Name <span class="text-destructive">*</span>
                            </label>
                            <Input
                                id="contactName"
                                name="contactName"
                                bind:value={contactName}
                                placeholder="Full name"
                                required />
                        </div>
                        <div class="space-y-2">
                            <label for="contactEmail" class="text-sm font-medium">
                                Email <span class="text-muted-foreground text-xs">(optional)</span>
                            </label>
                            <Input
                                id="contactEmail"
                                name="contactEmail"
                                type="email"
                                bind:value={contactEmail}
                                placeholder="email@example.com" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label for="status" class="text-sm font-medium">
                            Payment status <span class="text-destructive">*</span>
                        </label>
                        <select
                            id="status"
                            name="status"
                            bind:value={status}
                            class="{selectClass} max-w-xs">
                            <option value="paid">Paid</option>
                            <option value="pending">Not yet paid</option>
                            <option value="waived">Waived</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Party Members</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    {#each members as member, i}
                        <div
                            class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-end rounded-lg border p-3">
                            <div
                                class="grid grid-cols-1 gap-3 sm:grid-cols-2 {shirtsEnabled
                                    ? 'lg:grid-cols-4'
                                    : 'lg:grid-cols-3'}">
                                <div class="space-y-1.5">
                                    <label
                                        for="member-name-{i}"
                                        class="text-xs font-medium text-muted-foreground">
                                        Name <span class="text-destructive">*</span>
                                    </label>
                                    <Input
                                        id="member-name-{i}"
                                        bind:value={member.name}
                                        placeholder="Full name"
                                        required />
                                </div>
                                <div class="space-y-1.5">
                                    <label
                                        for="member-tier-{i}"
                                        class="text-xs font-medium text-muted-foreground">
                                        Category <span class="text-destructive">*</span>
                                    </label>
                                    <select
                                        id="member-tier-{i}"
                                        bind:value={member.tierId}
                                        class={selectClass}>
                                        <option value="">Select category…</option>
                                        {#each data.tiers as tier}
                                            <option value={tier.id}>
                                                {tier.label} — ${formatPrice(tier.priceCents)}
                                            </option>
                                        {/each}
                                    </select>
                                </div>
                                <div class="space-y-1.5">
                                    <label
                                        for="member-bday-{i}"
                                        class="text-xs font-medium text-muted-foreground">
                                        Birthday
                                        <span class="text-muted-foreground/60">(optional)</span>
                                    </label>
                                    <DatePicker
                                        id="member-bday-{i}"
                                        bind:value={member.birthDate}
                                        placeholder="Optional" />
                                </div>
                                {#if shirtsEnabled}
                                    <div class="space-y-1.5">
                                        <label
                                            for="member-shirt-{i}"
                                            class="text-xs font-medium text-muted-foreground">
                                            T-shirt
                                            <span class="text-muted-foreground/60">(optional)</span>
                                        </label>
                                        <select
                                            id="member-shirt-{i}"
                                            bind:value={member.shirtSize}
                                            class={selectClass}>
                                            <option value="">Select size…</option>
                                            {#each SHIRT_SIZES as size}
                                                <option value={size}>{size}</option>
                                            {/each}
                                        </select>
                                    </div>
                                {/if}
                            </div>
                            {#if members.length > 1}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="text-muted-foreground hover:text-destructive"
                                    onclick={() => removeMember(i)}>
                                    Remove
                                </Button>
                            {/if}
                        </div>
                    {/each}

                    <Button type="button" variant="outline" size="sm" onclick={addMember}>
                        + Add person
                    </Button>

                    {#if totalCents > 0}
                        <div class="flex items-center justify-between border-t pt-3 text-sm">
                            <span class="text-muted-foreground">Total</span>
                            <span class="font-semibold">${formatPrice(totalCents)}</span>
                        </div>
                    {/if}
                </CardContent>
            </Card>

            <div class="flex gap-3">
                <Button type="submit">Add Registration</Button>
                <Button type="button" variant="ghost" href="/admin">Cancel</Button>
            </div>
        </form>
    {/if}
</section>
