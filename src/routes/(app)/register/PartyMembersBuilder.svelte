<script lang="ts">
import { Plus, Trash2 } from '@lucide/svelte'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import {
    formatPrice,
    getMemberAge,
    getTierLabel,
    getTierPriceCents,
    isValidZip,
    splitFullName,
} from '$lib/utils'
import AdditionalQuestionsFields from './AdditionalQuestionsFields.svelte'
import AddressFields from './AddressFields.svelte'
import { EMPTY_PERSON_DETAILS } from './EMPTY_PERSON_DETAILS'
import ShirtSizeSelect from './ShirtSizeSelect.svelte'
import TierSelect from './TierSelect.svelte'
import type { ContactAddress, FormMember, TierOption } from './types'

let {
    members = $bindable([] as FormMember[]),
    tiers,
    contactName,
    contactAddress,
    error,
}: {
    members: FormMember[]
    tiers: TierOption[]
    contactName: string
    contactAddress: ContactAddress
    error?: string
} = $props()

/* undefined = closed, 'new' = adding a person, number = editing that member's index. */
let formTarget = $state<number | 'new' | undefined>(undefined)
let newFirstName = $state('')
let newLastName = $state('')
let newTierId = $state('')
let newBirthDate = $state<string | undefined>(undefined)
let newShirtSize = $state('')
let newSameAddress = $state(true)
let newAddressLine1 = $state('')
let newAddressLine2 = $state('')
let newAddressCity = $state('')
let newAddressState = $state('')
let newAddressZip = $state('')
/* Seeded from EMPTY_PERSON_DETAILS rather than a literal, so the party-member form and the contact
   form cannot end up pre-answering differently. The contact's vegetarian question defaults to 'no';
   this had its own hard-coded '' and would have gone on demanding an answer per added person, which is
   the friction the default exists to remove. */
let newVegetarianMeal = $state<'yes' | 'no' | ''>(EMPTY_PERSON_DETAILS.vegetarianMeal)
let newAttendedReunion2025 = $state<'yes' | 'no' | ''>(EMPTY_PERSON_DETAILS.attendedReunion2025)

let addressComplete = $derived(
    newSameAddress ||
        (!!newAddressLine1.trim() &&
            !!newAddressCity.trim() &&
            !!newAddressState.trim() &&
            !!newAddressZip.trim() &&
            isValidZip(newAddressZip)),
)
/* No check on newVegetarianMeal: it arrives answered, and requiring it here would block Save on a
   field the registrant has no reason to touch. newAttendedReunion2025 IS still required — it has no
   defensible default, so it stays a question. */
let canSaveMember = $derived(
    !!newFirstName.trim() &&
        !!newLastName.trim() &&
        !!newTierId &&
        !!newShirtSize &&
        addressComplete &&
        !!newAttendedReunion2025,
)

function handleSaveMember() {
    if (!canSaveMember) {
        return
    }
    const savedMember: FormMember = {
        name: `${newFirstName.trim()} ${newLastName.trim()}`,
        tierId: newTierId,
        birthDate: newBirthDate,
        shirtSize: newShirtSize,
        addressLine1: newSameAddress ? contactAddress.addressLine1 : newAddressLine1,
        addressLine2: newSameAddress ? contactAddress.addressLine2 : newAddressLine2,
        addressCity: newSameAddress ? contactAddress.addressCity : newAddressCity,
        addressState: newSameAddress ? contactAddress.addressState : newAddressState,
        addressZip: newSameAddress ? contactAddress.addressZip : newAddressZip,
        vegetarianMeal: newVegetarianMeal,
        attendedReunion2025: newAttendedReunion2025,
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
    newTierId = member.tierId
    newBirthDate = member.birthDate
    newShirtSize = member.shirtSize ?? ''
    newSameAddress = false
    newAddressLine1 = member.addressLine1
    newAddressLine2 = member.addressLine2 ?? ''
    newAddressCity = member.addressCity
    newAddressState = member.addressState
    newAddressZip = member.addressZip
    newVegetarianMeal = member.vegetarianMeal
    newAttendedReunion2025 = member.attendedReunion2025
    formTarget = index
}

function handleCancelAdd() {
    resetAddForm()
}

function resetAddForm() {
    newFirstName = ''
    newLastName = ''
    newTierId = ''
    newBirthDate = undefined
    newShirtSize = ''
    newSameAddress = true
    newAddressLine1 = ''
    newAddressLine2 = ''
    newAddressCity = ''
    newAddressState = ''
    newAddressZip = ''
    newVegetarianMeal = EMPTY_PERSON_DETAILS.vegetarianMeal
    newAttendedReunion2025 = EMPTY_PERSON_DETAILS.attendedReunion2025
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
                            {getTierLabel(member.tierId, tiers)}
                            {#if member.birthDate}
                                · Age {getMemberAge(member.birthDate)}
                            {/if}
                            {#if member.shirtSize}
                                · Size {member.shirtSize}
                            {/if}
                        </p>
                    </div>
                    <span class="text-sm font-medium tabular-nums shrink-0"
                        >${formatPrice(getTierPriceCents(member.tierId, tiers))}</span>
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
        <CardContent class="space-y-6">
            <div class="space-y-4">
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
                        <Input
                            id="new-last"
                            type="text"
                            bind:value={newLastName}
                            placeholder="Last" />
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div class="space-y-1.5">
                        <label for="new-tier" class="text-sm font-medium">
                            Registration Tier <span class="text-destructive">*</span>
                        </label>
                        <TierSelect id="new-tier" bind:tierId={newTierId} {tiers} />
                    </div>

                    <div class="space-y-1.5">
                        <label for="new-shirt" class="text-sm font-medium">
                            T-shirt <span class="text-destructive">*</span>
                        </label>
                        <ShirtSizeSelect id="new-shirt" bind:value={newShirtSize} />
                    </div>

                    <div class="space-y-1.5">
                        <label for="new-bday" class="text-sm font-medium">
                            Birthday
                            <span class="text-muted-foreground font-normal text-xs"
                                >(optional)</span>
                        </label>
                        <DatePicker
                            id="new-bday"
                            bind:value={newBirthDate}
                            placeholder="Their birthday" />
                    </div>
                </div>
            </div>

            <Separator />

            <div class="space-y-4">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Additional Questions
                </p>
                <AdditionalQuestionsFields
                    idPrefix="new"
                    bind:vegetarianMeal={newVegetarianMeal}
                    bind:attendedReunion2025={newAttendedReunion2025} />
            </div>

            <Separator />

            <div class="space-y-4">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Mailing Address
                </p>
                <label class="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        bind:checked={newSameAddress}
                        class="h-4 w-4 rounded border-input" />
                    Same address as {contactName || 'you'}
                </label>
                {#if !newSameAddress}
                    <AddressFields
                        idPrefix="new-address"
                        bind:addressLine1={newAddressLine1}
                        bind:addressLine2={newAddressLine2}
                        bind:addressCity={newAddressCity}
                        bind:addressState={newAddressState}
                        bind:addressZip={newAddressZip} />
                {/if}
            </div>

            <div class="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={!canSaveMember}
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
