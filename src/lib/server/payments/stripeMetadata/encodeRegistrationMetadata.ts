/* Stripe metadata for a full registration checkout.

   donationId is omitted entirely when there is no gift rather than sent as '': Stripe stores
   metadata as strings, and decodeSessionMetadata treats an empty value the same as a missing key,
   so sending one would only add a way for the two to disagree. */
export function encodeRegistrationMetadata(
    registrationId: string,
    managementToken: string,
    donationId?: string,
): Record<string, string> {
    return {
        type: 'registration',
        registrationId,
        managementToken,
        ...(donationId ? { donationId } : {}),
    }
}
