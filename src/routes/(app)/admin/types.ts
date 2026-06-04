import type { EventStatus } from '$lib/general/constants'

export type EventMetric = {
    eventId: string
    registrationCount: number
    revenueCents: string | null
}

export type ReunionEvent = {
    id: string
    title: string
    year: number
    status: EventStatus
    startDate: Date | null
    endDate: Date | null
}

export type Profile = {
    id: string
    userId: string
    phone: string | null
    isDeleted: boolean | null
    registeredEventIds: string[]
}

export type Photo = {
    id: string
    url: string
    caption: string | null
    r2Key: string | null
    eventId: string | null
    createdAt: Date | null
    uploadedByUserId: string
    eventTitle: string | null
}
