<script lang="ts">
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

{#if data.events.length === 0}
    <div class="alert alert-warning col-span-12">
        <span>No reunion events are currently open for registration. Check back later!</span>
    </div>
{:else}
    <section class="card bg-base-100 col-span-12 xl:col-span-7 shadow-xs">
        <div class="card-body">
            <h2 class="card-title">Select Event</h2>
            <fieldset class="fieldset w-full">
                <select class="select w-full" bind:value={selectedEventId}>
                    {#each data.events as event}
                        <option value={event.id}>{event.title} ({event.year})</option>
                    {/each}
                </select>
            </fieldset>

            <hr class="border-base-content/5 my-4 border-t-2" />

            <h2 class="card-title">Party Members</h2>
            <p class="text-sm text-base-content/60">Add everyone attending in your household.</p>

            <div
                class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
                <fieldset class="fieldset">
                    <label class="label">Name</label>
                    <input
                        type="text"
                        class="input input-sm w-full"
                        bind:value={newName}
                        placeholder="Full name" />
                </fieldset>
                <fieldset class="fieldset">
                    <label class="label">Birth Year</label>
                    <input
                        type="number"
                        class="input input-sm w-full"
                        bind:value={newBirthYear}
                        min="1900"
                        max={new Date().getFullYear()} />
                </fieldset>
                <fieldset class="fieldset">
                    <label class="label">Month</label>
                    <select class="select select-sm w-full" bind:value={newBirthMonth}>
                        <option value={null}>—</option>
                        {#each Array.from({ length: 12 }, (_, i) => i + 1) as m}
                            <option value={m}
                                >{new Date(2000, m - 1).toLocaleString('default', {
                                    month: 'short',
                                })}</option>
                        {/each}
                    </select>
                </fieldset>
                <fieldset class="fieldset">
                    <label class="label">Day</label>
                    <input
                        type="number"
                        class="input input-sm w-full"
                        bind:value={newBirthDay}
                        min="1"
                        max="31"
                        placeholder="—" />
                </fieldset>
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
                    </table>
                </div>
            {/if}
        </div>
    </section>

    <section class="card bg-base-100 col-span-12 xl:col-span-5 shadow-xs self-start">
        <div class="card-body">
            <h2 class="card-title">Order Summary</h2>

            <div class="space-y-2">
                <h3 class="text-sm font-bold text-base-content/50">Pricing Tiers</h3>
                {#each data.tiers as tier}
                    <div class="flex items-center justify-between text-sm">
                        <span>
                            {tier.label}
                            <span class="text-base-content/50"
                                >({tier.minAge}{tier.maxAge ? `–${tier.maxAge}` : '+'})</span>
                        </span>
                        <span class="font-mono">${formatPrice(tier.priceCents)}</span>
                    </div>
                {/each}
            </div>

            <hr class="border-base-content/5 my-4 border-t-2" />

            {#if members.length > 0}
                <div class="space-y-2">
                    {#each members as member}
                        <div class="flex items-center justify-between text-sm">
                            <span>{member.name}</span>
                            <span class="font-mono">${getTierPrice(member.tierId)}</span>
                        </div>
                    {/each}
                </div>
                <hr class="border-base-content/5 my-4 border-t-2" />
                <div class="flex items-center justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${formatPrice(total)}</span>
                </div>

                <form method="POST" class="mt-6">
                    <input type="hidden" name="eventId" value={selectedEventId} />
                    <input type="hidden" name="members" value={JSON.stringify(members)} />
                    <button type="submit" class="btn btn-primary w-full">
                        Pay ${formatPrice(total)} & Register
                    </button>
                </form>
            {:else}
                <p class="text-sm text-base-content/60 text-center py-4">
                    Add party members to see your total.
                </p>
            {/if}
        </div>
    </section>
{/if}
