import { z } from 'zod'
import { ANNOUNCEMENT_AUDIENCES } from '$lib/general/constants'

export const SUBJECT_MAX_LENGTH = 150
export const BODY_MAX_LENGTH = 10000

/* What the owner writes. Trimmed so a subject of spaces is refused rather than sent blank. */
export const announcementSchema = z.object({
    subject: z
        .string()
        .trim()
        .min(1, 'Write a subject')
        .max(SUBJECT_MAX_LENGTH, `Keep the subject under ${SUBJECT_MAX_LENGTH} characters`),
    body: z
        .string()
        .trim()
        .min(1, 'Write the message')
        .max(BODY_MAX_LENGTH, `Keep the message under ${BODY_MAX_LENGTH} characters`),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
})
