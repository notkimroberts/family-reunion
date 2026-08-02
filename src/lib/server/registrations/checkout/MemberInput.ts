import type { RegistrationCategory } from '$lib/types/registrationCategory'

export type MemberInput = {
    name: string
    category: RegistrationCategory
    birthDate?: string
    shirtSize?: string
}
