import { formatPrice } from './price'

/* An amount with its currency symbol, e.g. "$165.09".

   Exists because a Svelte component CANNOT safely write the symbol itself in its script block.
   `bun run format` splices the formatted script back into the file with a plain String.replace, so
   the replacement's special patterns fire on the code: `$$` collapses to `$`, and `$'` splices in
   the rest of the file and corrupts it outright. That is how AdminCancelDialog came to offer a
   refund of "165.09". A `.ts` file goes through a different path and is unaffected, so the symbol
   lives here. See the formatting note in CLAUDE.md.

   Markup is safe and does not need this — `$` followed by `{formatPrice(x)}` in a template is
   ordinary text next to an expression, and there are dozens of those. Reach for this when the
   string is built in a script block. */
export function formatUsd(cents: number): string {
    return '$' + formatPrice(cents)
}
