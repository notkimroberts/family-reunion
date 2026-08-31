<script lang="ts">
import { Separator } from '$lib/components/ui/separator'
import { formatPrice } from '$lib/utils'
import type { RegistrationMoney } from '../registrationMoney'

/* The fee breakdown for one registration, matching the panel beside the list line for line.

   It exists because the panel could say "Stripe fees −$24.10" for a year and no screen said which
   booking that came off. On a refunded row it also answers the question the status badge raises and
   does not settle: whether cancelling this one cost the reunion anything.

   The arithmetic is getRegistrationMoney's; this file only decides how it reads. */

let {
    money,
    status,
}: {
    money: RegistrationMoney
    status: 'pending' | 'paid' | 'waived' | 'refunded'
} = $props()

const FEE_NOTE = {
    exact: 'As charged by Stripe.',
    estimated: 'Estimated at 2.9% + 30¢ — Stripe has not reported the actual fee for this charge.',
}
</script>

<div class="flex flex-col gap-2 text-sm">
    <div class="flex items-baseline justify-between gap-3">
        <span class="text-muted-foreground">
            {status === 'refunded' ? 'Charged' : 'Party total'}
        </span>
        <span class="tabular-nums">${formatPrice(money.totalCents)}</span>
    </div>

    {#if money.wasCharged}
        <div class="flex items-baseline justify-between gap-3">
            <span class="text-amber-700 dark:text-amber-400">Stripe fee</span>
            <span class="text-amber-700 tabular-nums dark:text-amber-400">
                −${formatPrice(money.feeCents)}
            </span>
        </div>
        <Separator />
        <div class="flex items-baseline justify-between gap-3 font-semibold">
            <!-- A refunded booking kept nothing and still paid the fee, so naming the last line
                 "Kept" would print $0.00 beside a fee and leave the loss unstated. -->
            <span>{status === 'refunded' ? 'Cost of cancelling' : 'Reunion keeps'}</span>
            <span class="tabular-nums">
                {#if status === 'refunded'}
                    −${formatPrice(money.lostFeeCents)}
                {:else}
                    ${formatPrice(money.netCents)}
                {/if}
            </span>
        </div>
        <p class="text-muted-foreground text-xs">
            {money.feeIsExact ? FEE_NOTE.exact : FEE_NOTE.estimated}
            {#if status === 'refunded'}
                Stripe does not return its fee on a refund, so this is gone with nobody attending.
            {/if}
        </p>
    {:else}
        <Separator />
        <div class="flex items-baseline justify-between gap-3 font-semibold">
            <span>{status === 'paid' ? 'Reunion keeps' : 'Taken so far'}</span>
            <span class="tabular-nums">
                ${formatPrice(status === 'paid' ? money.netCents : 0)}
            </span>
        </div>
        <!-- Each of these is a genuinely different reason for "no fee", and reading the wrong one
             off a bare $0.00 is how an organiser concludes a refund went missing. -->
        <p class="text-muted-foreground text-xs">
            {#if status === 'paid'}
                Paid by hand, so Stripe took nothing. It arrives in full once deposited.
            {:else if status === 'waived'}
                Comped, so nothing was ever charged.
            {:else if status === 'refunded'}
                No card was ever charged on this registration, so nothing was refunded and no fee
                was lost.
            {:else}
                Nothing has been charged yet.
            {/if}
        </p>
    {/if}
</div>
