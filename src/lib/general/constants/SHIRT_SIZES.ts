export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const

export type ShirtSize = (typeof SHIRT_SIZES)[number]
