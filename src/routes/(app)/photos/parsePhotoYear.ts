/* Reads ?year= off a gallery URL, or undefined for all years.

   Shared by the grid and the single-photo page so the filter cannot mean one thing in the list and
   another in the arrows — the same reasoning as lensFromUrl on the admin page. Anything
   unparseable is simply ignored rather than erroring: a mangled query string should show the whole
   gallery, not a 400. */
export function parsePhotoYear(url: URL): number | undefined {
    const parsed = Number.parseInt(url.searchParams.get('year') ?? '', 10)
    return Number.isInteger(parsed) ? parsed : undefined
}
