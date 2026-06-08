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

export type AdminUser = {
    id: string
    name: string
    email: string
    role: string | null
    createdAt: Date
    registeredEventIds: string[]
}

export type Photo = {
    id: string
    url: string
    caption: string | null
    r2Key: string | null
    eventId: string | null
    createdAt: Date | null
    uploadedByUserId: string | null
    eventTitle: string | null
}
