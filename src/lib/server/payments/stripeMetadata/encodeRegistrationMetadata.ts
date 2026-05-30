export function encodeRegistrationMetadata(registrationId: string): Record<string, string> {
    return { type: 'registration', registrationId }
}
