/* A place attendees need to find: the reunion venue or the host hotel. */
export type ReunionLocation = {
    kind: 'venue' | 'hotel'
    /* Short label shown above the name, e.g. 'Host Hotel'. */
    badge: string
    name: string
    tagline: string
    websiteUrl: string
    /* Path under static/, or undefined to fall back to a flat placeholder. */
    imageUrl?: string
    /* Business name Google Maps can geocode — drives both the embed and the directions link. */
    mapQuery: string
    /* Confirmed practical facts only (phone, check-in, parking, group rate). */
    details: { label: string; value: string }[]
}
