<script lang="ts">
import { Separator } from '$lib/components/ui/separator'
import { cn, formatPrice } from '$lib/utils'
import type { RegistrationTotals } from './registrationTotals'

/* What the year adds up to, for the panel beside the list.

   Two matched groups, paid-or-covered and not-paid, because a count whose qualifier is invisible
   gets read as a bug. The arithmetic itself is in registrationTotals.ts and tested there; this file
   only decides how the numbers are read, which is why it can be a component with no test. */

/* Matches the subheadings on the event settings page, so the two admin surfaces read as one design. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'

let { totals }: { totals: RegistrationTotals } = $props()
</script>

<!-- Two matched groups. The sub-heading carries the qualifier, so the row labels do not have to
         repeat it and the two sets scan as a pair — which is the point: the numbers only make sense
         against each other. Before this the qualifier was invisible and "Parties 4" beside eleven
         bookings read as broken maths. -->
<div class="flex flex-col gap-3">
    <p class={SUBHEAD_CLASS}>Paid or covered</p>
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground text-sm">People</span>
        <span class="text-2xl font-bold tabular-nums">{totals.attendingCount}</span>
    </div>
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground text-sm">Parties</span>
        <span class="text-lg font-semibold tabular-nums">{totals.partyCount}</span>
    </div>
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground text-sm">Collected</span>
        <span class="text-lg font-semibold tabular-nums">
            ${formatPrice(totals.paidCents)}
        </span>
    </div>

    <!-- What the registrants paid is not what the reunion gets to spend. Card money arrives
             short by Stripe's cut; cash and cheques arrive whole. Only the last line is the
             spendable number, so it is the one carrying the weight.

             Shown when there is card money OR a cancelled card booking: a year whose only card
             registration was refunded has no card income and still lost the fee on it. -->
    {#if totals.cardPaidCents > 0 || totals.lostToRefundsCents > 0}
        <div class="flex flex-col gap-1.5 pl-2">
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-muted-foreground text-xs">By card</span>
                <span class="text-muted-foreground text-xs tabular-nums">
                    ${formatPrice(totals.cardPaidCents)}
                </span>
            </div>
            {#if totals.offlinePaidCents > 0}
                <div class="flex items-baseline justify-between gap-3">
                    <span class="text-muted-foreground text-xs">Cash or cheque</span>
                    <span class="text-muted-foreground text-xs tabular-nums">
                        ${formatPrice(totals.offlinePaidCents)}
                    </span>
                </div>
            {/if}
            <div class="flex items-baseline justify-between gap-3">
                <span class="text-xs text-amber-700 dark:text-amber-400">Stripe fees</span>
                <span class="text-xs tabular-nums text-amber-700 dark:text-amber-400">
                    −${formatPrice(totals.feeCents)}
                </span>
            </div>
            <!-- Only when it has happened. A zero line here would invite the question every
                     time, and the answer is usually "nobody cancelled". -->
            {#if totals.lostToRefundsCents > 0}
                <div class="flex items-baseline justify-between gap-3">
                    <span class="text-xs text-amber-700 dark:text-amber-400">
                        Lost to refunds
                    </span>
                    <span class="text-xs tabular-nums text-amber-700 dark:text-amber-400">
                        −${formatPrice(totals.lostToRefundsCents)}
                    </span>
                </div>
            {/if}
        </div>

        <div class="flex items-baseline justify-between gap-3">
            <span class="text-sm font-medium">In the bank</span>
            <span class="text-lg font-semibold tabular-nums">
                ${formatPrice(totals.bankedCents)}
            </span>
        </div>
        <!-- The wording tracks what the numbers actually are. Once every card payment has its
                 fee recorded from Stripe's balance transaction, this stops saying "estimated" —
                 claiming precision the figures do not have is the failure mode worth avoiding, and
                 so is disclaiming precision they do have. -->
        <p class="text-muted-foreground text-xs">
            {#if totals.feesAreExact}
                Fees as charged by Stripe.
            {:else}
                Fees estimated at 2.9% + 30¢ per card payment.
            {/if}
            Cash and cheques arrive in full, once deposited.
            {#if totals.lostToRefundsCents > 0}
                Stripe keeps its fee when a booking is cancelled, so that money does not come back.
            {/if}
        </p>
    {/if}
</div>

<Separator />

<div class="flex flex-col gap-3">
    <p class={SUBHEAD_CLASS}>Not paid</p>
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground text-sm">People</span>
        <span class="text-2xl font-bold tabular-nums">{totals.pendingPeopleCount}</span>
    </div>
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground text-sm">Parties</span>
        <span class="text-lg font-semibold tabular-nums">
            {totals.pendingPartyCount}
        </span>
    </div>
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground text-sm">Outstanding</span>
        <span
            class={cn(
                'text-lg font-semibold tabular-nums',
                totals.outstandingCents > 0 && 'text-amber-700 dark:text-amber-400',
            )}>
            ${formatPrice(totals.outstandingCents)}
        </span>
    </div>
</div>
