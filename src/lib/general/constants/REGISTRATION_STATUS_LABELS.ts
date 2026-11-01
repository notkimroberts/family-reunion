import type { DisplayStatus } from '$lib/utils'

/* The words for each shown status, apart from REGISTRATION_STATUS_STYLES so server code (the CSV
   export) can use them without importing the icons, which are .svelte files node cannot load. */
export const REGISTRATION_STATUS_LABELS = {
    paid: 'Paid',
    partly_paid: 'Partly paid',
    payment_due: 'Payment due',
    pending: 'Pending',
    waived: 'Waived',
    refunded: 'Refunded',
} as const satisfies Record<DisplayStatus, string>
