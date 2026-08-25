/* Flattens superforms' nested error tree into readable "field: message" lines.

   superforms nests errors to match the data: scalars hold a string[], objects nest further, and
   arrays keep per-index entries plus a top-level `_errors`. Rendering only a few known fields — as
   these forms used to — means a failure anywhere else displays nothing at all, which is why three
   separate bugs all presented identically as "clicking does nothing". */
export function flattenFormErrors(errors: unknown, path: string[] = []): string[] {
    if (!errors) {
        return []
    }

    if (Array.isArray(errors)) {
        /* A leaf: the messages for the field at `path`. */
        if (errors.every((entry) => typeof entry === 'string')) {
            const label = path.join('.')
            return errors.map((message) => (label ? `${label}: ${message}` : message))
        }
        /* An array field: recurse per index so the offending member is identifiable. */
        return errors.flatMap((entry, index) => flattenFormErrors(entry, [...path, String(index)]))
    }

    if (typeof errors === 'object') {
        return Object.entries(errors as Record<string, unknown>).flatMap(([key, value]) =>
            /* `_errors` belongs to the parent, not a field of its own. */
            key === '_errors'
                ? flattenFormErrors(value, path)
                : flattenFormErrors(value, [...path, key]),
        )
    }

    return []
}
