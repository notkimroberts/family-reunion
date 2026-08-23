/* Escapes text for interpolation into email HTML. Party member names, venue text and event
   titles are all operator- or registrant-supplied, so they cannot be trusted as markup. */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
