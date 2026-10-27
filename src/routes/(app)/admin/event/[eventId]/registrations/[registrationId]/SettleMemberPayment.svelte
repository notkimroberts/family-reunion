<script lang="ts">
import { ChevronDown, CircleCheck, Gift } from '@lucide/svelte'
import { enhance } from '$app/forms'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '$lib/components/ui/alert-dialog'
import { Button } from '$lib/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '$lib/components/ui/dropdown-menu'
import type { MemberSettlement } from '$lib/general/constants'
import { REGISTRATION_STATUS_STYLES } from '$lib/general/constants/REGISTRATION_STATUS_STYLES'
import { cn, formatUsd } from '$lib/utils'

/* What each settlement does, said before it happens. Neither can be undone from this page — Mark paid
   clears the amount owed and Cover zeroes the price — and both email the registrant, so each asks
   first, in the same dialog AdminCancelDialog uses.

   Mark paid names Zelle and check because a card payment marks itself through the webhook; an
   organizer who has just seen the charge in Stripe has nothing to do here. Cover takes the
   destructive colors, like cancelling: it gives up money for good. formatUsd carries the dollar sign,
   because one written in a script block is corrupted by `bun run format`. */
/* The trigger IS the status, so it wears the Payment due badge's label, icon and colors. */
const DUE_STYLE = REGISTRATION_STATUS_STYLES.payment_due
const DueIcon = DUE_STYLE.icon

const CONFIRM_COPY: Record<
    MemberSettlement,
    {
        title: (name: string) => string
        description: (name: string, amount: string, contactEmail: string) => string
        action: string
        actionClass: string
    }
> = {
    paid: {
        title: (name) => `Mark ${name} as paid?`,
        description: (name, amount, contactEmail) =>
            `Records that ${amount} for ${name}'s place arrived by Zelle or check. A card payment marks itself, so use this only for money paid another way. ${contactEmail} is emailed that the payment was received.`,
        action: 'Mark paid',
        actionClass: '',
    },
    covered: {
        title: (name) => `Cover ${name}'s place?`,
        description: (name, amount, contactEmail) =>
            `${name}'s price becomes ${formatUsd(0)}, and the ${amount} they owe is not collected. ${contactEmail} is emailed that there is nothing to pay.`,
        action: 'Cover place',
        actionClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
}

/* The Payment cell for one person added after the booking was paid: ONE control that is both the
   status and the action — an amber "Payment due" button in the status badges' palette (amber is money
   still owed) whose menu holds the two settlements. A badge beside a separate "Record payment" button
   said the same thing twice, and two loose buttons before that read as clutter. Each menu item opens
   its confirmation dialog. */
let {
    memberId,
    name,
    priceCents,
    contactEmail,
}: { memberId: string; name: string; priceCents: number; contactEmail: string } = $props()

let open = $state(false)
let settlement = $state<MemberSettlement>('paid')
let submitting = $state(false)

let copy = $derived(CONFIRM_COPY[settlement])

function handleOpen(chosen: MemberSettlement) {
    settlement = chosen
    open = true
}
</script>

<DropdownMenu>
    <DropdownMenuTrigger>
        {#snippet child({ props })}
            <Button
                {...props}
                variant="outline"
                size="sm"
                class={cn(
                    'gap-1.5',
                    DUE_STYLE.class,
                    'hover:bg-amber-100 hover:text-amber-950 dark:hover:bg-amber-900 dark:hover:text-amber-100',
                )}>
                <DueIcon class="size-3.5" />
                {DUE_STYLE.label}
                <ChevronDown class="size-3.5" />
            </Button>
        {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuLabel>Record how it was settled</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleOpen('paid')}>
            <CircleCheck class="size-4" />
            Paid by Zelle or check
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleOpen('covered')}>
            <Gift class="size-4" />
            Cover their place
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>

<AlertDialog bind:open>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>{copy.title(name)}</AlertDialogTitle>
            <AlertDialogDescription>
                {copy.description(name, formatUsd(priceCents), contactEmail)} This cannot be undone here.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Go back</AlertDialogCancel>
            <!-- Closes whatever the result, unlike AdminCancelDialog: a refused settlement (nobody owed
                 any more) cannot succeed on a retry, and the page's toast carries the reason. -->
            <form
                method="POST"
                action="?/settle_member"
                use:enhance={() => {
                    submitting = true
                    return async ({ update }) => {
                        await update()
                        submitting = false
                        open = false
                    }
                }}>
                <input type="hidden" name="memberId" value={memberId} />
                <input type="hidden" name="settlement" value={settlement} />
                <AlertDialogAction type="submit" class={copy.actionClass} disabled={submitting}>
                    {copy.action}
                </AlertDialogAction>
            </form>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
