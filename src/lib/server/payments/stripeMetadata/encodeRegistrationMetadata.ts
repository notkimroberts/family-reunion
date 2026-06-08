export function encodeRegistrationMetadata(
    registrationId: string,
    managementToken: string,
): Record<string, string> {
    return { type: 'registration', registrationId, managementToken }
}
