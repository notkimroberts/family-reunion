<script lang="ts">
import { Info } from '@lucide/svelte'
import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip'
import { cn, formatUsd } from '$lib/utils'
import type { EventMoney } from './eventMoney'

/* What the reunion has, as one figure with its workings under it.

   THE HEADLINE IS THE POINT. This panel used to print "In the bank" twice — once for registrations,
   once for gifts — and leave the organiser to add them up; the first question anyone brings to this
   screen is "how much money do we have", and it now has one answer. The rows beneath are the terms
   of that sum, and getEventMoney's test pins them to it: registrations + gifts − fees − losses is
   the figure above them, or the panel is lying about its own arithmetic.

   Every row is conditional, so a new year is three lines rather than eight zeroes. The arithmetic
   lives in eventMoney.ts and is tested there; this file only decides how it reads. */

/* Matches the subheadings on the event settings page, so the two admin surfaces read as one design. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'
/* Money that came off the top, or has not arrived. */
const AMBER_CLASS = 'text-amber-700 dark:text-amber-400'

let { money }: { money: EventMoney } = $props()

/* Assembled from what is actually true, not printed unconditionally.

   These were two paragraphs of prose sitting in the middle of a column of figures, which pushed the
   order sheet off the fold. Behind an ⓘ they are still one tap away for the organiser who wonders
   why the total is short — the same move the Comped line already makes. */
let notes = $derived([
    money.feesAreExact
        ? 'Fees are as charged by Stripe.'
        : 'Fees are estimated at 2.9% + 30¢ per payment. The exact figure is recorded as each one settles.',
    ...(money.toDepositCents > 0
        ? [
              /* formatUsd, because a literal dollar sign written anywhere in a script block —
                 code OR comment — is corrupted by `bun run format`. See formatUsd and the
                 formatting note in CLAUDE.md. */
              `Includes ${formatUsd(money.toDepositCents)} in cash or cheques. Those arrive in full, but only once deposited.`,
          ]
        : []),
    ...(money.attachedGiftCount > 0
        ? [
              'A gift given with a registration shares that booking’s charge, so its fee is counted with the places.',
          ]
        : []),
    ...(money.lostToRefundsCents > 0
        ? ['Stripe keeps its fee when a booking is cancelled, so that money does not come back.']
        : []),
])
</script>

{#snippet term(label: string, amount: string, negative: boolean)}
    <div class="flex items-baseline justify-between gap-3">
        <span class={cn('text-sm', negative ? AMBER_CLASS : 'text-muted-foreground')}>
            {label}
        </span>
        <span class={cn('text-sm tabular-nums', negative ? AMBER_CLASS : '')}>{amount}</span>
    </div>
{/snippet}

<div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
        <p class={SUBHEAD_CLASS}>Money</p>
        {#if money.hasActivity}
            <Tooltip>
                <TooltipTrigger
                    class="text-muted-foreground hover:text-foreground transition-colors">
                    <Info class="size-3.5" />
                    <span class="sr-only">How these figures are worked out</span>
                </TooltipTrigger>
                <TooltipContent class="flex max-w-xs flex-col gap-2">
                    {#each notes as note (note)}
                        <p>{note}</p>
                    {/each}
                </TooltipContent>
            </Tooltip>
        {/if}
    </div>

    {#if !money.hasActivity}
        <p class="text-muted-foreground text-sm">No money in yet.</p>
    {:else}
        <div class="flex flex-col gap-0.5">
            <span class="text-muted-foreground text-sm">In the bank</span>
            <span class="text-3xl font-bold tabular-nums">
                {formatUsd(money.bankedCents)}
            </span>
        </div>

        <div class="flex flex-col gap-1.5">
            {#if money.registrationsCents > 0}
                {@render term('Registrations', formatUsd(money.registrationsCents), false)}
            {/if}
            {#if money.giftCount > 0}
                {@render term(`Gifts (${money.giftCount})`, formatUsd(money.giftsCents), false)}
            {/if}
            {#if money.feeCents > 0}
                {@render term('Stripe fees', '−' + formatUsd(money.feeCents), true)}
            {/if}
            <!-- Only when it has happened. A zero line here would invite the question every time,
                 and the answer is usually "nobody cancelled". -->
            {#if money.lostToRefundsCents > 0}
                {@render term('Lost to refunds', '−' + formatUsd(money.lostToRefundsCents), true)}
            {/if}
        </div>

        <!-- Above the rule is money the reunion HAS; this is money it is owed, so it sits below one
             and must never read as a term in the sum. -->
        {#if money.outstandingCents > 0}
            <div class="flex items-baseline justify-between gap-3 border-t pt-3">
                <span class="text-sm font-medium">Outstanding</span>
                <span class={cn('text-lg font-semibold tabular-nums', AMBER_CLASS)}>
                    {formatUsd(money.outstandingCents)}
                </span>
            </div>
        {/if}
    {/if}
</div>
