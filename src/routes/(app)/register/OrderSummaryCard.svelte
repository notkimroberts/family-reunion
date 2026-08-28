<script lang="ts">
import { LoaderCircle } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { NativeSelect } from '$lib/components/ui/native-select'
import { Separator } from '$lib/components/ui/separator'
import { formatPrice, getTierPriceCents } from '$lib/utils'
import type { FormMember, TierOption } from './types'

type Status = 'paid' | 'pending' | 'waived'

/* Explicit labels rather than relying on Select.Value to resolve one. The items live inside
   Select.Content, which bits-ui renders lazily, so before the menu is first opened the trigger
   fell back to printing the raw value — "paid" in lowercase. */
const statusLabelsValue: Record<Status, string> = {
    paid: 'Paid',
    pending: 'Pending',
    waived: 'Waived',
}

let {
    contactName,
    selfTierId,
    members,
    tiers,
    subtotal,
    processingFee = 0,
    canSubmit,
    submitLabel,
    submitting = false,
    submittingLabel = 'Redirecting to checkout…',
    placeholderText = 'Enter your name, email, and birthday above to get started.',
    contactSuffix = 'you',
    status = $bindable<Status>('paid'),
    showStatus = false,
    submitFootnote,
}: {
    contactName: string
    selfTierId: string | ''
    members: FormMember[]
    tiers: TierOption[]
    subtotal: number
    processingFee?: number
    canSubmit: boolean
    submitLabel: string
    submitting?: boolean
    submittingLabel?: string
    placeholderText?: string
    contactSuffix?: string
    status?: Status
    showStatus?: boolean
    submitFootnote?: string
} = $props()

let total = $derived(subtotal + processingFee)
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle>Order Summary</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
        {#if canSubmit}
            <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                    <span>
                        {contactName || 'You'}
                        <span class="text-muted-foreground text-xs">({contactSuffix})</span>
                    </span>
                    <span class="tabular-nums">
                        {selfTierId ? '$' + formatPrice(getTierPriceCents(selfTierId, tiers)) : ''}
                    </span>
                </div>
                {#each members as member (member.name + member.tierId)}
                    <div class="flex items-center justify-between text-sm">
                        <span class="truncate mr-2">{member.name}</span>
                        <span class="tabular-nums shrink-0"
                            >${formatPrice(getTierPriceCents(member.tierId, tiers))}</span>
                    </div>
                {/each}
            </div>
            <Separator />
            <div class="space-y-1 text-sm">
                <div class="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span class="tabular-nums">${formatPrice(subtotal)}</span>
                </div>
                {#if processingFee > 0}
                    <div class="flex items-center justify-between text-muted-foreground">
                        <span>Processing fee</span>
                        <span class="tabular-nums">${formatPrice(processingFee)}</span>
                    </div>
                {/if}
            </div>
            <Separator />
            <div class="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>${formatPrice(total)}</span>
            </div>
            {#if showStatus}
                <Separator />
                <div class="space-y-1.5">
                    <label for="orderStatus" class="text-sm font-medium">Payment status</label>
                    <NativeSelect id="orderStatus" name="status" bind:value={status}>
                        {#each Object.entries(statusLabelsValue) as [value, label] (value)}
                            <option {value}>{label}</option>
                        {/each}
                    </NativeSelect>
                </div>
            {/if}
            <Button type="submit" class="w-full" disabled={submitting}>
                {#if submitting}
                    <LoaderCircle class="size-4 animate-spin" />
                    {submittingLabel}
                {:else}
                    {submitLabel}
                {/if}
            </Button>
            {#if submitFootnote}
                <p class="text-xs text-muted-foreground text-center">{submitFootnote}</p>
            {/if}
        {:else}
            <!-- The prices the tier dropdown no longer carries. Without this the first sight of a
                 figure is after the whole form is filled and saved, which is a poor moment to learn
                 what the reunion costs. Presented as a rate card, not as options to choose between:
                 which tier applies follows from age. -->
            <div class="flex flex-col gap-2">
                {#each tiers as tier (tier.id)}
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-muted-foreground">{tier.label}</span>
                        <span class="tabular-nums">${formatPrice(tier.priceCents)}</span>
                    </div>
                {/each}
            </div>
            <Separator />
            <p class="text-sm text-muted-foreground text-center">{placeholderText}</p>
        {/if}
    </CardContent>
</Card>
