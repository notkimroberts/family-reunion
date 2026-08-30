import { getPaymentState } from '$lib/utils'

/* The coloured left edge on a booking row.

   Amber when the row needs chasing, green when the money is in, red when it was cancelled and
   refunded. Both pending states share amber and both paid states share green, because the edge
   answers "does this row want anything from me" at a glance and the note beside the name says which
   kind of amber it is.

   Red is the exception to that reading — a cancelled booking wants nothing — but it earns an edge for
   the opposite reason: cancelled rows stay in the list, count towards no total, and must not be
   mistaken for a live booking while counting chairs.

   Waived is sky, the same hue as its badge: nothing is owed and nothing arrived, so it is neither the green of money in nor the
   amber of money wanted — but a row with no edge at all read as an unstyled row rather than a
   deliberate state, and it is the one status whose people count towards catering while its money
   counts towards nothing.

   Extracted from the page to be exhaustively testable. Refunded went unmarked for exactly the reason
   this file exists: the function ended in a bare `return ''`, so a state nobody had thought about got
   no edge and no error. */
export function rowAccent(registration: Parameters<typeof getPaymentState>[0]): string {
    switch (getPaymentState(registration)) {
        case 'checkout_incomplete':
        case 'awaiting_payment':
            return 'border-l-4 border-l-amber-500 pl-3'
        case 'paid_online':
        case 'paid_offline':
            return 'border-l-4 border-l-green-500 pl-3'
        case 'cancelled':
            return 'border-l-4 border-l-red-600 pl-3'
        case 'waived':
            return 'border-l-4 border-l-sky-500 pl-3'
    }
}
