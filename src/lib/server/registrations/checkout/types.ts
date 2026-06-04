import type { registrationStatusEnum } from '$lib/server/db/schema'
import type { MemberInput } from './MemberInput'

export type Tier = { label: string; priceCents: number }

export type CreatePendingRegistrationParams = {
    userId: string
    userName: string
    eventId: string
    selfTierId: string
    selfBirthDate?: string
    selfShirtSize?: string
    additionalMembers: MemberInput[]
    successUrl: (registrationId: string) => string
    cancelUrl: (registrationId: string) => string
}

export type AdminMemberInput = {
    name: string
    birthDate?: string
    tierId: string
    shirtSize?: string
}

export type CreateAdminRegistrationParams = {
    eventId: string
    contactName: string
    contactEmail: string | null
    status: (typeof registrationStatusEnum.enumValues)[number]
    members: AdminMemberInput[]
}

export type AddMemberParams = {
    registrationId: string
    userId: string
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
    successUrl: string
    cancelUrl: string
}
