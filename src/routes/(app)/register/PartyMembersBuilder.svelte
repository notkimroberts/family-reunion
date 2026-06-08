<script lang="ts">
import { Plus, Trash2 } from '@lucide/svelte'
import { Select as BitsSelect } from 'bits-ui'
import { SvelteMap } from 'svelte/reactivity'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import { parseBirthDate } from '$lib/utils/age'
import { getDefaultTierId, getTierLabel, getTierPrice, getMemberAge } from './pricingUtils'
import type { PricingTier } from './pricingUtils'
import type { FormMember } from './types'

let {
    members = $bindable([] as FormMember[]),
    tiers,
    shirtsEnabled = false,
    error,
}: {
    members: FormMember[]
    tiers: PricingTier[]
    shirtsEnabled?: boolean
    error?: string
} = $props()

const tierMap = $derived(new SvelteMap(tiers.map((t) => [t.id, t])))

let showAddForm = $state(false)
let newFirstName = $state('')
let newLastName = $state('')
let newTierId = $state('')
let newBirthDate = $state<string | undefined>(undefined)
let newShirtSize = $state('')

/* Auto-select tier from new member birthday — same behavior as the registrant. */
$effect(() => {
    if (newBirthDate) {
        const parsed = parseBirthDate(newBirthDate)
        if (parsed) {
            const suggested = getDefaultTierId(tiers, parsed.birthYear)
            if (suggested) {
                newTierId = suggested
            }
        }
    }
})

function handleAddMember() {
    if (!newFirstName.trim() || !newLastName.trim() || !newTierId || !newBirthDate) {
        return
    }
    members = [
        ...members,
        {
            name: `${newFirstName.trim()} ${newLastName.trim()}`,
            tierId: newTierId,
            birthDate: newBirthDate,
            shirtSize: newShirtSize || undefined,
        },
    ]
    resetAddForm()
    showAddForm = false
}

function handleCancelAdd() {
    showAddForm = false
    resetAddForm()
}

function resetAddForm() {
    newFirstName = ''
    newLastName = ''
    newTierId = ''
    newBirthDate = undefined
    newShirtSize = ''
}

function handleRemoveMember(index: number) {
    members = members.filter((_, i) => i !== index)
}
</script>

{#if members.length > 0}
    <div class="space-y-2">
        {#each members as member, i (i)}
            <div class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{member.name}</p>
                    <p class="text-xs text-muted-foreground">
                        {getTierLabel(tierMap, member.tierId)}
                        {#if member.birthDate}
                            · Age {getMemberAge(member.birthDate)}
                        {/if}
                        {#if shirtsEnabled && member.shirtSize}
                            · Size {member.shirtSize}
                        {/if}
                    </p>
                </div>
                <span class="text-sm font-medium tabular-nums shrink-0"
                    >${getTierPrice(tierMap, member.tierId)}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onclick={() => handleRemoveMember(i)}>
                    <Trash2 class="h-3.5 w-3.5" />
                    <span class="sr-only">Remove {member.name}</span>
                </Button>
            </div>
        {/each}
    </div>
{/if}

{#if error}
    <p class="text-sm text-destructive">{error}</p>
{/if}

{#if showAddForm}
    <Card class="border-dashed">
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Add a person</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <label for="new-first" class="text-sm font-medium">
                        First name <span class="text-destructive">*</span>
                    </label>
                    <Input
                        id="new-first"
                        type="text"
                        bind:value={newFirstName}
                        placeholder="First" />
                </div>
                <div class="space-y-1.5">
                    <label for="new-last" class="text-sm font-medium">
                        Last name <span class="text-destructive">*</span>
                    </label>
                    <Input id="new-last" type="text" bind:value={newLastName} placeholder="Last" />
                </div>
            </div>
            <div class="grid grid-cols-1 gap-3 {shirtsEnabled ? 'sm:grid-cols-2' : ''}">
                <div class="space-y-1.5">
                    <label for="new-bday" class="text-sm font-medium">
                        Birthday <span class="text-destructive">*</span>
                    </label>
                    <DatePicker
                        id="new-bday"
                        bind:value={newBirthDate}
                        placeholder="Their birthday" />
                </div>

                {#if shirtsEnabled}
                    <div class="space-y-1.5">
                        <label for="new-shirt" class="text-sm font-medium">
                            T-shirt
                            <span class="text-muted-foreground font-normal text-xs"
                                >(optional)</span>
                        </label>
                        <Select.Root
                            type="single"
                            value={newShirtSize}
                            onValueChange={(v) => (newShirtSize = v)}>
                            <Select.Trigger id="new-shirt">
                                <BitsSelect.Value placeholder="Select size…" />
                            </Select.Trigger>
                            <Select.Content>
                                {#each SHIRT_SIZES as size (size)}
                                    <Select.Item value={size} label={size} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                {/if}
            </div>
            <div class="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={!newFirstName.trim() ||
                        !newLastName.trim() ||
                        !newTierId ||
                        !newBirthDate}
                    onclick={handleAddMember}>
                    Add to party
                </Button>
                <Button type="button" size="sm" variant="ghost" onclick={handleCancelAdd}>
                    Cancel
                </Button>
            </div>
        </CardContent>
    </Card>
{:else}
    <p class="text-sm text-muted-foreground">
        Include children — we use this to plan programming and food.
    </p>
    <Button
        type="button"
        variant="outline"
        class="w-full border-dashed"
        onclick={() => (showAddForm = true)}>
        <Plus class="h-4 w-4 mr-2" />
        Add another person
    </Button>
{/if}
