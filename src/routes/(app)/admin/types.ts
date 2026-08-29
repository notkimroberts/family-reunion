import type { EventStatus } from '$lib/general/constants'

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
}
