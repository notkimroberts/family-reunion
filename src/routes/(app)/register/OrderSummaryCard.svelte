<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Select from '$lib/components/ui/select'
import { Separator } from '$lib/components/ui/separator'
import { formatPrice } from '$lib/utils'
import { getTierPrice } from './pricingUtils'
import type { PricingTier } from './pricingUtils'
import type { FormMember } from './types'

type Status = 'paid' | 'pending' | 'waived'

let {
    contactName,
    selfTier,
    members,
    tierMap,
    subtotal,
    processingFee = 0,
    canSubmit,
    submitLabel,
    placeholderText = 'Enter your name, email, and birthday above to get started.',
    contactSuffix = 'you',
    status = $bindable<Status>('paid'),
    showStatus = false,
    submitFootnote,
}: {
    contactName: string
    selfTier: PricingTier | undefined
    members: FormMember[]
    tierMap: Map<string, PricingTier>
    subtotal: number
    processingFee?: number
    canSubmit: boolean
    submitLabel: string
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
                        {selfTier ? `$${formatPrice(selfTier.priceCents)}` : ''}
                    </span>
                </div>
                {#each members as member (member.name + member.tierId)}
                    <div class="flex items-center justify-between text-sm">
                        <span class="truncate mr-2">{member.name}</span>
                        <span class="tabular-nums shrink-0"
                            >${getTierPrice(tierMap, member.tierId)}</span>
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
                    <Select.Root
                        type="single"
                        value={status}
                        onValueChange={(v) => (status = v as Status)}
                        name="status">
                        <Select.Trigger id="orderStatus" class="w-full">
                            <BitsSelect.Value placeholder="Select status…" />
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="paid" label="Paid" />
                            <Select.Item value="pending" label="Pending" />
                            <Select.Item value="waived" label="Waived" />
                        </Select.Content>
                    </Select.Root>
                </div>
            {/if}
            <Button type="submit" class="w-full">{submitLabel}</Button>
            {#if submitFootnote}
                <p class="text-xs text-muted-foreground text-center">{submitFootnote}</p>
            {/if}
        {:else}
            <p class="text-sm text-muted-foreground text-center py-6">{placeholderText}</p>
        {/if}
    </CardContent>
</Card>
