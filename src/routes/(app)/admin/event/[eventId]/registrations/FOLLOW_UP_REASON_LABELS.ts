import type { FollowUpReason } from './followUps'

/* What an organizer is calling about, in their words. */
export const FOLLOW_UP_REASON_LABELS = {
    payment_due: 'Owes for someone added',
    awaiting_check: 'Check not received',
    missing_shirt_size: 'No shirt size',
    hotel_undecided: 'Hotel: not sure',
    hotel_not_asked: 'Hotel: never asked',
} as const satisfies Record<FollowUpReason, string>
