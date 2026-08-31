import { describe, expect, it } from 'vitest'
import { isChildTierLabel } from './isChildTierLabel'

/* The predicate gates one thing: the contact's own tier. It is a word match on a label the
   organiser typed, so the cases worth pinning are the labels a real event actually carries and the
   ones a bare substring test would get wrong. */
describe('isChildTierLabel', () => {
    it.each(['Child', 'child', 'Children', 'Kid', 'Kids', 'Youth', 'Infant', 'Toddler', 'Minor'])(
        'recognises %s',
        (label) => {
            expect(isChildTierLabel(label)).toBe(true)
        },
    )

    it.each(['Adult', 'Senior', 'Guest', 'Adult (18+)'])('does not recognise %s', (label) => {
        expect(isChildTierLabel(label)).toBe(false)
    })

    /* A bare `label.includes('child')` would refuse both of these. The word boundary is what keeps a
       legitimate adult tier from being read as a child one. */
    it.each(['Childminder', 'Grandchild-free'])('does not match %s on a substring', (label) => {
        expect(isChildTierLabel(label)).toBe(false)
    })

    it('matches inside a longer label', () => {
        expect(isChildTierLabel('Child (5-12)')).toBe(true)
    })
})
