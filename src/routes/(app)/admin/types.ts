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

/* Kept in step with the schema by hand, and it had drifted: r2Key, eventId and eventTitle were all
   widened to `| null` here while photos.eventId and photos.r2Key are both .notNull(). The widening was
   load-bearing in the wrong direction — it made a null branch on eventTitle look necessary (a LEFT JOIN
   on a NOT NULL foreign key cannot miss) and it made the r2Key that drives the R2 delete look optional. */
export type Photo = {
    id: string
    url: string
    caption: string | null
    r2Key: string
    eventId: string
    createdAt: Date | null
    uploadedByUserId: string | null
    eventTitle: string
}
