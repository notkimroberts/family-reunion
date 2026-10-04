/* An amount for a headline figure: "$75", "$1,000", "$27.50".

   Not formatUsd, which prints "$1000.00" — right in a ledger, fussy in a goal line. Thousands are
   grouped and ".00" is dropped, but real cents stay: rounding a gift to the dollar would misstate
   what was given. */
const headlineFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    trailingZeroDisplay: 'stripIfInteger',
})

export function formatUsdHeadline(cents: number): string {
    return headlineFormatter.format(cents / 100)
}
