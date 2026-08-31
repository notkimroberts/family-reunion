import { readFileSync, readdirSync } from 'fs'
import { describe, expect, it } from 'vitest'

/* Pins the bug that took the whole registrations page down.

   The bookings mobile card was one big <a> to the registration. Then PaymentNote gained a "View in
   Stripe" link, which put an <a> inside an <a> — invalid HTML. The browser's parser hoists the inner
   anchor out, so the hydrated tree no longer matches what the server rendered, Svelte throws
   node_invalid_placement_ssr, and the error boundary replaces the page.

   Two things make this worth a test rather than a fixed comment:

   - `bun run check` cannot see it. Both are valid Svelte; the rule is an HTML parsing one.
   - It is not a mobile-only failure. AdminDataView renders BOTH branches into the DOM and hides one
     with display:none, so a broken mobile card takes the desktop table with it. The screenshot that
     found this was a desktop window.

   The check walks the file in tag order tracking anchor depth, because the ancestor and the
   descendant are hundreds of lines apart and no single regex spans that honestly. */

const ROUTE_DIR = 'src/routes/(app)/admin/event/[eventId]/registrations'

/* Anything that renders an <a> at runtime. A shadcn Button with href is an anchor, not a button —
   the same trap in a different costume. */
const LINK_RENDERERS = ['<PaymentNote', '<Button href']

const TAGS = /<!--[\s\S]*?-->|<\/a\s*>|<a[\s>]|<PaymentNote|<Button\s+href/g

/* Depth of enclosing <a> elements at each place a link-rendering thing appears. */
function linkDepths(source: string): { needle: string; depth: number }[] {
    const found: { needle: string; depth: number }[] = []
    let depth = 0

    for (const [match] of source.matchAll(TAGS)) {
        if (match.startsWith('<!--')) {
            continue
        }
        if (match.startsWith('</a')) {
            depth = Math.max(0, depth - 1)
            continue
        }
        if (match.startsWith('<a')) {
            depth += 1
            continue
        }
        found.push({ needle: match.replace(/\s+/g, ' '), depth })
    }

    return found
}

const svelteFiles = readdirSync(ROUTE_DIR)
    .filter((name) => name.endsWith('.svelte'))
    .map((name) => `${ROUTE_DIR}/${name}`)

describe('no link inside a link on the registrations list', () => {
    /* The walk is only meaningful if it is reading the files that carry the risk. */
    it('is reading the page that renders the bookings list', () => {
        expect(svelteFiles).toContain(`${ROUTE_DIR}/+page.svelte`)
        expect(readFileSync(`${ROUTE_DIR}/+page.svelte`, 'utf8')).toMatch(/<PaymentNote/)
    })

    it.each(svelteFiles)('%s nests no link inside an anchor', (path) => {
        const nested = linkDepths(readFileSync(path, 'utf8')).filter((entry) => entry.depth > 0)
        expect(nested, `${path}: ${nested.map((n) => n.needle).join(', ')} inside an <a>`).toEqual(
            [],
        )
    })

    /* Proves the walk can actually fail — the assertions above pass trivially on a file with no
       links at all, and this is the shape the real bug had. */
    it('detects the shape the bug had', () => {
        const broken = '<a href="/x"><div><PaymentNote {registration} /></div></a>'
        expect(linkDepths(broken)).toEqual([{ needle: '<PaymentNote', depth: 1 }])
    })

    it('accepts a link beside one rather than inside it', () => {
        const fixed = '<div><a href="/x">Name</a><PaymentNote {registration} /></div>'
        expect(linkDepths(fixed)).toEqual([{ needle: '<PaymentNote', depth: 0 }])
    })

    /* A commented-out anchor must not leave the walk stuck at depth 1 and fail everything after
       it — the page is heavily commented, so this is the likeliest false positive. */
    it('ignores anchors inside comments', () => {
        const commented = '<!-- was <a href="/x"> --><PaymentNote {registration} />'
        expect(linkDepths(commented)).toEqual([{ needle: '<PaymentNote', depth: 0 }])
    })

    it('counts a Button with href as a link', () => {
        const broken = '<a href="/x"><Button href="/y">Manage</Button></a>'
        expect(linkDepths(broken)).toEqual([{ needle: '<Button href', depth: 1 }])
    })

    /* Documents what the list covers, so adding a link-rendering component means deciding whether
       it belongs here rather than finding out from a blank page. */
    it('knows what renders a link', () => {
        expect(LINK_RENDERERS).toEqual(['<PaymentNote', '<Button href'])
    })
})
