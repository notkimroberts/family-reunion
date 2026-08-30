import { SHIRT_SIZES } from '$lib/general/constants'

/* The options a shirt-size select must offer for a value already on the row.

   SHIRT_SIZES is the adult list, and it is the only list in the app: nothing reads a tier's
   shirtSizeCategory when rendering sizes, so a Child attendee was offered adult sizes on the public
   form and whatever they picked is what is stored. Rendering only the canonical list would therefore
   drop any value that came from an older list — the select would show the first option as selected and
   the organiser would be looking at a size the database does not hold, with no way to tell.

   So an unrecognised value is appended and kept selectable. It sorts last, which is also where
   peopleSummary puts it in the order sheet, so the two agree. */
export function shirtSizeOptions(currentValue: string): string[] {
    const trimmed = currentValue.trim()
    if (trimmed === '' || (SHIRT_SIZES as readonly string[]).includes(trimmed)) {
        return [...SHIRT_SIZES]
    }
    return [...SHIRT_SIZES, trimmed]
}
