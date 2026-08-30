/* One search term against several fields of one row.

   Case-insensitive substring, and an empty term matches everything — a blank box is not a filter.
   Trimmed, because a trailing space arrives free from a phone keyboard's autocomplete and would
   otherwise silently empty the list. */
export function matchesSearch(term: string, fields: readonly string[]): boolean {
    const needle = term.trim().toLowerCase()
    return needle === '' || fields.some((value) => value.toLowerCase().includes(needle))
}
