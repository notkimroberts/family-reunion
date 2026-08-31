// Stripe metadata for a standalone donation checkout
export function encodeDonationMetadata(donationId: string): Record<string, string> {
    return { type: 'donation', donationId }
}
