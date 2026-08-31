export type RefundPlanMember = {
    priceCents: number
    stripePaymentIntentId: string | null
}

export type RefundPlanGift = {
    amountCents: number
    stripePaymentIntentId: string | null
}

export type PlannedRefund = {
    intentId: string
    /* undefined means refund the whole charge — Stripe's own default, and what every cancellation
       did before gifts existed. A number is a partial refund in cents. */
    amountCents: number | undefined
}

/* How much to send back on each charge, given that a gift may be riding on one of them.

   A GIFT IS NOT REFUNDED WITH THE BOOKING. Someone who cancels their place has not asked for their
   gift back, and the reunion keeps it. But a gift added during registration was a LINE ITEM on the
   registration's own charge, so a full refund returns it whether anyone meant to or not — Stripe
   refunds charges, not line items, and it has no idea the two things mean different things to us.
   The only way to keep a gift is to refund less than the charge.

   So: an intent carrying no gift is refunded IN FULL, exactly as before — no arithmetic, nothing to
   drift, and every booking without a gift behaves identically to the day before this existed. An
   intent carrying one is refunded the party's share instead, which is the sum of the snapshotted
   member prices on it. Those prices ARE the line items (createPendingRegistration snapshots the
   grossed-up figure it sends to Stripe), so the two agree by construction rather than by estimate.

   Attribution when no member names an intent: that is the fallback path where the id came from the
   Checkout session rather than the rows, and there is exactly one intent, so every member belongs
   to it. With several intents and no attributable member, the charge is the gift alone — and a
   kept gift means there is nothing to send back, so the refund is dropped rather than issued for
   zero, which Stripe rejects. */
export function planRefunds(input: {
    intentIds: readonly string[]
    members: readonly RefundPlanMember[]
    gifts: readonly RefundPlanGift[]
}): PlannedRefund[] {
    const noMemberNamesAnIntent = input.members.every(
        (member) => member.stripePaymentIntentId === null,
    )

    return input.intentIds
        .map((intentId) => {
            const giftCents = input.gifts
                .filter((gift) => gift.stripePaymentIntentId === intentId)
                .reduce((sum, gift) => sum + gift.amountCents, 0)

            if (giftCents === 0) {
                return { intentId, amountCents: undefined }
            }

            const attributed = input.members.filter(
                (member) => member.stripePaymentIntentId === intentId,
            )
            const onThisCharge =
                attributed.length > 0 || !(noMemberNamesAnIntent && input.intentIds.length === 1)
                    ? attributed
                    : input.members

            return {
                intentId,
                amountCents: onThisCharge.reduce((sum, member) => sum + member.priceCents, 0),
            }
        })
        .filter((refund) => refund.amountCents !== 0)
}
