<script lang="ts">
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import { isValidZip } from '$lib/utils'
import AdditionalQuestionsFields from './AdditionalQuestionsFields.svelte'
import AddressFields from './AddressFields.svelte'
import ShirtSizeSelect from './ShirtSizeSelect.svelte'
import TierSelect from './TierSelect.svelte'
import type { TierOption } from './types'

/* Shared by the registrant's manage page and the admin registration detail page. The fields
   collected are identical; what differs is the action behind it — the registrant's goes through
   Stripe Checkout, the admin's inserts offline. So the action is a prop and the token is optional,
   since an admin has no plaintext token to send (the DB stores only the hash). */
let {
    token = undefined,
    registrationId,
    tiers,
    onCancel,
    action = '?/add_member',
    title = 'Add a Member',
    submitNote = undefined,
    submitLabel = 'Continue to Payment',
    submittingLabel = 'Redirecting to checkout…',
}: {
    token?: string
    registrationId: string
    tiers: TierOption[]
    onCancel?: () => void
    action?: string
    title?: string
    submitNote?: string
    /* The registrant's path ends at Stripe; the admin's saves directly. The wording has to differ
       or an offline addition tells the organiser it is about to take a payment. */
    submitLabel?: string
    submittingLabel?: string
} = $props()

let name = $state('')
let tierId = $state('')
let birthDate = $state<string | undefined>(undefined)
let shirtSize = $state('')
let addressLine1 = $state('')
let addressLine2 = $state('')
let addressCity = $state('')
let addressState = $state('')
let addressZip = $state('')
let vegetarianMeal = $state<'yes' | 'no' | ''>('')
let attendedReunion2025 = $state<'yes' | 'no' | ''>('')
let submitting = $state(false)

let canSubmit = $derived(
    !!name.trim() &&
        !!tierId &&
        !!addressLine1.trim() &&
        !!addressCity.trim() &&
        !!addressState.trim() &&
        !!addressZip.trim() &&
        isValidZip(addressZip) &&
        !!vegetarianMeal &&
        !!attendedReunion2025,
)
</script>

<Card>
    <CardHeader>
        <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
        <form
            method="POST"
            {action}
            use:enhance={() => {
                submitting = true
                /* Apply EVERY result, not just redirects. Gating this on result.type === 'redirect'
                   covered only the registrant's Stripe path: an admin addition returns success and a
                   validation failure returns fail(400), and both were dropped — nothing re-rendered,
                   so a member that had genuinely been created looked like a no-op. */
                return async ({ update }) => {
                    submitting = false
                    await update()
                }
            }}>
            {#if token}
                <input type="hidden" name="token" value={token} />
            {/if}
            <input type="hidden" name="registrationId" value={registrationId} />
            <input type="hidden" name="birthDate" value={birthDate ?? ''} />
            <input type="hidden" name="tierId" value={tierId} />

            <div class="space-y-6">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <label for="add-name" class="text-sm font-medium">
                            Name <span class="text-destructive">*</span>
                        </label>
                        <Input
                            id="add-name"
                            name="name"
                            type="text"
                            bind:value={name}
                            placeholder="Full name"
                            required />
                    </div>
                    <div class="space-y-2">
                        <label for="add-tier" class="text-sm font-medium">
                            Tier <span class="text-destructive">*</span>
                        </label>
                        <TierSelect id="add-tier" bind:tierId {tiers} />
                    </div>
                    <div class="space-y-2">
                        <label for="add-birthDate" class="text-sm font-medium">
                            Birthday <span class="text-muted-foreground">(optional)</span>
                        </label>
                        <DatePicker
                            id="add-birthDate"
                            bind:value={birthDate}
                            placeholder="Select birthday" />
                    </div>
                    <div class="space-y-2">
                        <label for="add-shirt" class="text-sm font-medium">
                            T-Shirt Size <span class="text-muted-foreground">(optional)</span>
                        </label>
                        <ShirtSizeSelect
                            id="add-shirt"
                            name="shirtSize"
                            bind:value={shirtSize}
                            emptyLabel="No shirt" />
                    </div>
                </div>

                <Separator />

                <div class="space-y-4">
                    <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Additional Questions
                    </p>
                    <AdditionalQuestionsFields
                        idPrefix="add"
                        withFieldNames
                        bind:vegetarianMeal
                        bind:attendedReunion2025 />
                </div>

                <Separator />

                <div class="space-y-4">
                    <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Mailing Address
                    </p>
                    <AddressFields
                        idPrefix="add-address"
                        withFieldNames
                        bind:addressLine1
                        bind:addressLine2
                        bind:addressCity
                        bind:addressState
                        bind:addressZip />
                </div>

                <div class="flex flex-col gap-2 pt-2">
                    {#if submitNote}
                        <p class="text-muted-foreground text-right text-xs">{submitNote}</p>
                    {/if}
                    <div class="flex justify-end gap-2">
                        {#if onCancel}
                            <Button type="button" variant="outline" onclick={onCancel}>
                                Cancel
                            </Button>
                        {/if}
                        <Button type="submit" disabled={submitting || !canSubmit}>
                            {submitting ? submittingLabel : submitLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    </CardContent>
</Card>
