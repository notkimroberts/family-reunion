import { reunionMetadataSchema, type ReunionMetadata } from '$lib/general/reunionMetadata'

/* Turns the settings page's one metadata textarea into an object, or into a message saying why not.

   This function is the whole safety net, so it is separate and tested. The action it replaced caught
   JSON.parse and stored null: with three textareas that silently blanked one section of /program, and
   with a single textarea holding all six things it would silently blank the entire page. A save that
   reports success and destroys the program is the worst available outcome, so nothing here fails
   quietly.

   Blank is not an error — it means the event has no program content yet, which is every event in
   draft. It stores {} rather than being refused.

   The zod schema is strict(), so a typo'd key ("menus") is reported rather than accepted and dropped.
   Error text names the failing paths because the owner is editing raw JSON and "invalid" alone gives
   them nothing to look for. */
export function parseReunionMetadata(
    raw: string,
): { metadata: ReunionMetadata } | { error: string } {
    const trimmed = raw.trim()
    if (!trimmed) {
        return { metadata: {} }
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(trimmed)
    } catch (err) {
        const detail = err instanceof Error ? err.message : 'could not be read'
        return { error: `Event details are not valid JSON: ${detail}` }
    }

    const result = reunionMetadataSchema.safeParse(parsed)
    if (!result.success) {
        const problems = result.error.issues
            .map((issue) => {
                const path = issue.path.join('.')
                return path ? `${path}: ${issue.message}` : issue.message
            })
            .join('; ')
        return { error: `Event details JSON does not match the expected shape — ${problems}` }
    }

    return { metadata: result.data }
}
