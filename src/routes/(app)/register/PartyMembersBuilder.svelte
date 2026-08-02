<script lang="ts">
import { Plus, Trash2 } from '@lucide/svelte'
import { Select as BitsSelect } from 'bits-ui'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import {
    formatPrice,
    getCategoryPriceCents,
    getMemberAge,
    REGISTRATION_CATEGORY_LABELS,
    splitFullName,
} from '$lib/utils'
import CategorySelect from './CategorySelect.svelte'
import type { FormMember } from './types'

let {
    members = $bindable([] as FormMember[]),
    adultPriceCents,
    childPriceCents,
    shirtsEnabled = false,
    error,
}: {
    members: FormMember[]
    adultPriceCents: number
    childPriceCents: number
    shirtsEnabled?: boolean
    error?: string
} = $props()

/* undefined = closed, 'new' = adding a person, number = editing that member's index. */
let formTarget = $state<number | 'new' | undefined>(undefined)
let newFirstName = $state('')
let newLastName = $state('')
let newCategory = $state<RegistrationCategory | ''>('')
let newBirthDate = $state<string | undefined>(undefined)
let newShirtSize = $state('')

function handleSaveMember() {
    if (!newFirstName.trim() || !newLastName.trim() || !newCategory) {
        return
    }
    const savedMember: FormMember = {
        name: `${newFirstName.trim()} ${newLastName.trim()}`,
        category: newCategory,
        birthDate: newBirthDate,
        shirtSize: newShirtSize || undefined,
    }
    if (typeof formTarget === 'number') {
        members = members.map((m, i) => (i === formTarget ? savedMember : m))
    } else {
        members = [...members, savedMember]
    }
    resetAddForm()
}

function handleEditClick(index: number) {
    const member = members[index]
    const { firstName, lastName } = splitFullName(member.name)
    newFirstName = firstName
    newLastName = lastName
    newCategory = member.category
    newBirthDate = member.birthDate
    newShirtSize = member.shirtSize ?? ''
    formTarget = index
}

function handleCancelAdd() {
    resetAddForm()
}

function resetAddForm() {
    newFirstName = ''
    newLastName = ''
    newCategory = ''
    newBirthDate = undefined
    newShirtSize = ''
    formTarget = undefined
}

function handleRemoveMember(index: number) {
    members = members.filter((_, i) => i !== index)
}
</script>

{#if members.length > 0}
    <div class="space-y-2">
        {#each members as member, i (i)}
            {#if i !== formTarget}
                <div class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm">{member.name}</p>
                        <p class="text-xs text-muted-foreground">
                            {REGISTRATION_CATEGORY_LABELS[member.category]}
                            {#if member.birthDate}
                                · Age {getMemberAge(member.birthDate)}
                            {/if}
                            {#if shirtsEnabled && member.shirtSize}
                                · Size {member.shirtSize}
                            {/if}
                        </p>
                    </div>
                    <span class="text-sm font-medium tabular-nums shrink-0"
                        >${formatPrice(
                            getCategoryPriceCents(member.category, {
                                adultPriceCents,
                                childPriceCents,
                            }),
                        )}</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onclick={() => handleEditClick(i)}>
                        Edit
                    </Button>
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
            {/if}
        {/each}
    </div>
{/if}

{#if error}
    <p class="text-sm text-destructive">{error}</p>
{/if}

{#if formTarget !== undefined}
    <Card class="border-dashed">
        <CardHeader class="pb-3">
            <CardTitle class="text-base"
                >{typeof formTarget === 'number' ? 'Edit person' : 'Add a person'}</CardTitle>
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
            <div
                class="grid grid-cols-1 gap-3 sm:grid-cols-2 {shirtsEnabled
                    ? 'lg:grid-cols-3'
                    : ''}">
                <div class="space-y-1.5">
                    <label for="new-category" class="text-sm font-medium">
                        Category <span class="text-destructive">*</span>
                    </label>
                    <CategorySelect
                        id="new-category"
                        bind:category={newCategory}
                        {adultPriceCents}
                        {childPriceCents} />
                </div>

                <div class="space-y-1.5">
                    <label for="new-bday" class="text-sm font-medium">
                        Birthday
                        <span class="text-muted-foreground font-normal text-xs">(optional)</span>
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
                    disabled={!newFirstName.trim() || !newLastName.trim() || !newCategory}
                    onclick={handleSaveMember}>
                    Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onclick={handleCancelAdd}>
                    Cancel
                </Button>
            </div>
        </CardContent>
    </Card>
{:else}
    <Button
        type="button"
        variant="outline"
        class="w-full border-dashed"
        onclick={() => (formTarget = 'new')}>
        <Plus class="h-4 w-4 mr-2" />
        Add another person
    </Button>
{/if}
