<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'
import { formatPrice, getAge } from '$lib/utils'

let { data } = $props()

let selectedEventId = $state('')
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

let tierMap = $derived(new Map(data.tiers.map((t) => [t.id, t])))

function getTierForAge(age: number) {
    return data.tiers.find((t) => age >= t.minAge && (t.maxAge === null || age <= t.maxAge))
}

function addMember() {
    if (!newName.trim() || !newBirthYear) return
    const age = getAge(newBirthYear, newBirthMonth, newBirthDay)
    const tier = getTierForAge(age)
    if (!tier) return
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

function removeMember(index: number) {
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

<PageTitle title="Register" />

<div class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Register for Reunion</h1>

    {#if data.events.length === 0}
        <div class="alert alert-warning">
            <span>No reunion events are currently open for registration. Check back later!</span>
        </div>
    {:else}
        <div class="card bg-base-100 shadow-md">
            <div class="card-body">
                <h2 class="card-title">Select Event</h2>
                <select class="select select-bordered w-full" bind:value={selectedEventId}>
                    {#each data.events as event}
                        <option value={event.id}>{event.title} ({event.year})</option>
                    {/each}
                </select>
            </div>
        </div>

        <div class="card bg-base-100 shadow-md mt-6">
            <div class="card-body">
                <h2 class="card-title">Pricing</h2>
                <div class="space-y-2 md:hidden">
                    {#each data.tiers as tier}
                        <div
                            class="flex items-center justify-between rounded-lg border border-base-200 p-3">
                            <div>
                                <span class="font-medium">{tier.label}</span>
                                <span class="ml-2 text-sm text-base-content/60"
                                    >{tier.minAge}{tier.maxAge ? `–${tier.maxAge}` : '+'}</span>
                            </div>
                            <span class="font-semibold">${formatPrice(tier.priceCents)}</span>
                        </div>
                    {/each}
                </div>
                <div class="hidden overflow-x-auto md:block">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Age Range</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.tiers as tier}
                                <tr>
                                    <td>{tier.label}</td>
                                    <td>{tier.minAge}{tier.maxAge ? `–${tier.maxAge}` : '+'}</td>
                                    <td>${formatPrice(tier.priceCents)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow-md mt-6">
            <div class="card-body">
                <h2 class="card-title">Party Members</h2>
                <p class="text-sm text-base-content/60">
                    Add everyone attending in your household.
                </p>

                <div
                    class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
                    <div class="form-control">
                        <label class="label"><span class="label-text">Name</span></label>
                        <input
                            type="text"
                            class="input input-bordered input-sm"
                            bind:value={newName}
                            placeholder="Full name" />
                    </div>
                    <div class="form-control">
                        <label class="label"><span class="label-text">Birth Year</span></label>
                        <input
                            type="number"
                            class="input input-bordered input-sm"
                            bind:value={newBirthYear}
                            min="1900"
                            max={new Date().getFullYear()} />
                    </div>
                    <div class="form-control">
                        <label class="label"><span class="label-text">Month</span></label>
                        <select class="select select-bordered select-sm" bind:value={newBirthMonth}>
                            <option value={null}>—</option>
                            {#each Array.from({ length: 12 }, (_, i) => i + 1) as m}
                                <option value={m}
                                    >{new Date(2000, m - 1).toLocaleString('default', {
                                        month: 'short',
                                    })}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="form-control">
                        <label class="label"><span class="label-text">Day</span></label>
                        <input
                            type="number"
                            class="input input-bordered input-sm"
                            bind:value={newBirthDay}
                            min="1"
                            max="31"
                            placeholder="—" />
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick={addMember}
                        >Add</button>
                </div>

                {#if members.length > 0}
                    <div class="mt-4 space-y-3 md:hidden">
                        {#each members as member, i}
                            <div class="rounded-lg border border-base-200 p-3">
                                <div class="flex items-center justify-between">
                                    <span class="font-medium">{member.name}</span>
                                    <button
                                        type="button"
                                        class="btn btn-ghost btn-xs text-error"
                                        onclick={() => removeMember(i)}>✕</button>
                                </div>
                                <div class="mt-1 flex gap-4 text-sm text-base-content/60">
                                    <span
                                        >Age {getAge(
                                            member.birthYear,
                                            member.birthMonth,
                                            member.birthDay,
                                        )}</span>
                                    <span>{getTierLabel(member.tierId)}</span>
                                    <span class="ml-auto font-medium text-base-content"
                                        >${getTierPrice(member.tierId)}</span>
                                </div>
                            </div>
                        {/each}
                        <div class="flex justify-between border-t border-base-200 pt-3 font-bold">
                            <span>Total</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                    </div>
                    <div class="hidden overflow-x-auto md:block mt-4">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Age</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each members as member, i}
                                    <tr>
                                        <td>{member.name}</td>
                                        <td
                                            >{getAge(
                                                member.birthYear,
                                                member.birthMonth,
                                                member.birthDay,
                                            )}</td>
                                        <td>{getTierLabel(member.tierId)}</td>
                                        <td>${getTierPrice(member.tierId)}</td>
                                        <td>
                                            <button
                                                type="button"
                                                class="btn btn-ghost btn-xs text-error"
                                                onclick={() => removeMember(i)}>✕</button>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="font-bold text-right">Total:</td>
                                    <td class="font-bold">${formatPrice(total)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                {/if}
            </div>
        </div>

        {#if members.length > 0}
            <form method="POST" class="mt-6">
                <input type="hidden" name="eventId" value={selectedEventId} />
                <input type="hidden" name="members" value={JSON.stringify(members)} />
                <button type="submit" class="btn btn-primary btn-lg w-full">
                    Pay ${formatPrice(total)} & Register
                </button>
            </form>
        {/if}
    {/if}
</div>
