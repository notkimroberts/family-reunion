export const VALID_RELATIONSHIP_TYPES = [
    'parent',
    'child',
    'spouse',
    'sibling',
    'grandparent',
    'grandchild',
    'aunt_uncle',
    'niece_nephew',
    'cousin',
] as const

export type RelType = (typeof VALID_RELATIONSHIP_TYPES)[number]

export type Member = { id: string; name: string }
