<script lang="ts">
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
import { formatUsd, type PaymentState } from '$lib/utils'

/* Confirming a cancellation an organiser is making on someone else's behalf.

   The copy changes with how the money arrived, because that decides what the organiser has to do next
   and it is the one thing they cannot see from here. Telling them "a refund will be issued" for a family
   who paid by cheque would leave a real debt unpaid in the belief the app had handled it. */
const CONSEQUENCE: Record<PaymentState, (amount: string) => string> = {
    paid_online: (amount) =>
        `${amount} will be refunded to the card they paid with. This happens now, through Stripe.`,
    /* The case this whole feature was added for. */
    paid_offline: (amount) =>
        `They paid ${amount} directly, so nothing is refunded through Stripe — you will need to return it yourself. Their email will say so rather than promise a refund.`,
    checkout_incomplete: () =>
        'They never completed payment, so there is nothing to refund. This just closes the registration.',
    awaiting_payment: () =>
        'No payment was ever received, so there is nothing to refund. This just closes the registration.',
    waived: () => 'Their place was covered, so there is nothing to refund.',
    cancelled: () => 'This registration is already cancelled.',
}

let {
    contactName,
    paymentState,
    totalCents,
    memberCount,
    open = $bindable(false),
}: {
    contactName: string
    paymentState: PaymentState
    totalCents: number
    memberCount: number
    open: boolean
} = $props()

/* formatUsd carries the currency symbol, because a dollar sign written in a script block is
   corrupted by `bun run format` — which is how this dialog came to offer to refund "165.09".
   See formatUsd and the formatting note in CLAUDE.md. */
let consequence = $derived(CONSEQUENCE[paymentState](formatUsd(totalCents)))
</script>

<AlertDialog bind:open>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Cancel {contactName}'s registration?</AlertDialogTitle>
            <AlertDialogDescription>
                <!-- The head count is here because it is what leaves the catering numbers, and it is
                     the part an organiser is most likely to be checking. -->
                {memberCount}
                {memberCount === 1 ? 'person' : 'people'} will be removed from the reunion. {consequence}
                They will be emailed a record of it, and this cannot be undone — they would have to register
                again.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Keep registration</AlertDialogCancel>
            <form
                method="POST"
                action="?/cancel"
                use:enhance={() =>
                    async ({ result, update }) => {
                        /* update() before closing, so a failed refund leaves the dialog's own state
                           irrelevant and the page's toast carries the error. Omitting it would close
                           the dialog on a 502 as though the cancellation had worked. */
                        await update()
                        if (result.type === 'success') {
                            open = false
                        }
                    }}>
                <AlertDialogAction
                    type="submit"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Cancel registration
                </AlertDialogAction>
            </form>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
