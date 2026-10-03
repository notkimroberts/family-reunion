/* A stored value as an update email prints it, with an empty one named rather than left blank —
   "M → " reads as a rendering fault, "M → Not given" as a cleared field. */
export function describeOptional(value: string | null | undefined): string {
    return value || 'Not given'
}
