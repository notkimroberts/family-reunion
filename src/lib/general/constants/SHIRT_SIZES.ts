import { ADULT_SHIRT_SIZES } from './ADULT_SHIRT_SIZES'
import { YOUTH_SHIRT_SIZES } from './YOUTH_SHIRT_SIZES'

/* The canonical flat list, youth first. Order is load-bearing beyond the picker: the admin order
   sheet sorts by index into this array (peopleSummary.ts), so grouping here is what puts YS…YXL
   ahead of XS…XXXL on the sheet the shirts are ordered from. */
export const SHIRT_SIZES = [...YOUTH_SHIRT_SIZES, ...ADULT_SHIRT_SIZES] as const

export type ShirtSize = (typeof SHIRT_SIZES)[number]
