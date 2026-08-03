export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

export type ShirtSize = (typeof SHIRT_SIZES)[number]
