import { SHIRT_SIZES } from '$lib/general/constants'
import type { EventPerson } from '$lib/server/registrations'

/* What to order: shirt sizes broken down by tier, and the meal split.

   Both are derived from the People lens, which is paid-and-waived only, because these numbers become a
   purchase order. Counting a pending party's shirts would buy garments for people who may never come.

   Grouped by `tierLabel`, the snapshot party_members carries for exactly this kind of reading. This
   grouping IS the adult-versus-youth split an organiser needs — "Adult: S 1 M 3 · Child: S 1 M 1" — and
   it is why the tiers table no longer carries a shirt-size category: the label already says it, and a
   third tier appears here on its own with no code change. Reaching a per-tier column would have meant
   matching by label anyway, since party_members has no tier id.

   "Not answered" is counted separately from "no" throughout. For a caterer, three vegetarians and two
   unknowns is a different order from three vegetarians; collapsing the unknowns into "no" would quietly
   under-order. Same for a missing shirt size, which is a person to go back to rather than a size to
   guess. */
export type PeopleSummary = {
    shirtsByTier: {
        tierLabel: string
        sizes: { size: string; count: number }[]
        missing: number
    }[]
    shirtsMissing: number
    vegetarian: number
    standard: number
    mealUnanswered: number
}

/* SHIRT_SIZES order, not alphabetical: sorted by name the sizes read L, M, S, XL, XS, which is no use to
   anyone. An unrecognised size — a value from before the list settled — sorts to the end rather than
   being dropped. */
function bySizeOrder(a: string, b: string): number {
    const order = (size: string) => {
        const index = (SHIRT_SIZES as readonly string[]).indexOf(size)
        return index === -1 ? SHIRT_SIZES.length : index
    }
    return order(a) - order(b) || a.localeCompare(b)
}

export function getPeopleSummary(people: EventPerson[]): PeopleSummary {
    const tiers = new Map<string, { sizes: Map<string, number>; missing: number }>()

    for (const person of people) {
        const tier = tiers.get(person.tierLabel) ?? { sizes: new Map<string, number>(), missing: 0 }
        const size = person.shirtSize?.trim()
        if (size) {
            tier.sizes.set(size, (tier.sizes.get(size) ?? 0) + 1)
        } else {
            tier.missing += 1
        }
        tiers.set(person.tierLabel, tier)
    }

    return {
        /* Alphabetical by tier, so the order does not shift between reloads the way it would if it
           followed the people list, which is ordered by contact. */
        shirtsByTier: [...tiers.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tierLabel, tier]) => ({
                tierLabel,
                sizes: [...tier.sizes.entries()]
                    .sort(([a], [b]) => bySizeOrder(a, b))
                    .map(([size, count]) => ({ size, count })),
                missing: tier.missing,
            })),
        shirtsMissing: people.filter((person) => !person.shirtSize?.trim()).length,
        vegetarian: people.filter((person) => person.vegetarianMeal === true).length,
        standard: people.filter((person) => person.vegetarianMeal === false).length,
        mealUnanswered: people.filter((person) => person.vegetarianMeal === null).length,
    }
}
