/* Whether a tier label names a place for a child rather than an adult.

   Tiers carry no adult/child flag — the column existed, was write-only for its whole life, and was
   dropped. The LABEL is the distinction the organiser actually makes, and the order sheet already
   groups by it, so it is the only signal available.

   Stated plainly as a heuristic: a tier called "Teen" is not caught. It is used for exactly one
   thing — stopping the person who books and pays for a party from registering THEMSELVES as a
   child — where a miss costs nothing an organiser cannot fix from the admin, and a false positive
   would wrongly refuse a legitimate adult. Do not grow this into pricing or catering logic; those
   need a real column, not a word match. */
const CHILD_LABEL_PATTERN = /\b(child|children|kid|kids|youth|infant|toddler|baby|minor)s?\b/i

export function isChildTierLabel(label: string): boolean {
    return CHILD_LABEL_PATTERN.test(label)
}
