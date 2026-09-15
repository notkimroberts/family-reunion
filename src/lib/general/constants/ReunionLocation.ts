/* A place attendees need to find: the reunion venue or the host hotel. */
export type ReunionLocation = {
    kind: 'venue' | 'hotel'
    /* Short label shown above the name, e.g. 'Host Hotel'. */
    badge: string
    name: string
    tagline: string
    websiteUrl: string
    /* Where a room in the reunion's block is actually booked, when a block is held. Distinct from
       websiteUrl: the hotel's own site quotes rack rates and knows nothing about the block. */
    bookingUrl?: string
    /* Last day the block's discounted rate is honoured, already formatted for display. A plain
       string, not a Date: it is never compared, only printed. */
    bookingDeadline?: string
    instagramUrl?: string
    /* Path under static/, or undefined to fall back to a flat placeholder. */
    imageUrl?: string
    /* Business name Google Maps can geocode — drives both the embed and the directions link. */
    mapQuery: string
    /* Confirmed practical facts only (phone, check-in, parking, group rate). */
    details: { label: string; value: string }[]
}
