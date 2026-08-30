import { SHIRT_SIZES } from '$lib/general/constants'

/* The options a shirt-size select must offer for a value already on the row.

   SHIRT_SIZES is the only list in the app — every attendee is offered the same sizes, and the tier
   label is what says whether a row means an adult shirt or a child's. Rendering only the canonical list
   would drop any value that came from an older one — the select would show the first option as
   selected and the organiser would be looking at a size the database does not hold, with no way to
   tell.

   So an unrecognised value is appended and kept selectable. It sorts last, which is also where
   peopleSummary puts it in the order sheet, so the two agree. */
export function shirtSizeOptions(currentValue: string): string[] {
    const trimmed = currentValue.trim()
    if (trimmed === '' || (SHIRT_SIZES as readonly string[]).includes(trimmed)) {
        return [...SHIRT_SIZES]
    }
    return [...SHIRT_SIZES, trimmed]
}
