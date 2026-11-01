import { randomUUID } from 'node:crypto'
import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { isUuid } from '$lib/general/ids'
import {
    createAnnouncement,
    deliverAnnouncement,
    getAnnouncementRecipients,
    getAnnouncementsForEvent,
} from '$lib/server/announcements'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import { renderAnnouncement, sendAnnouncement } from '$lib/server/email'
import { reportError } from '$lib/server/reportError'
import type { Actions, PageServerLoad, RequestEvent } from './$types'
import type { AnnouncementFeedback } from './announcementFeedback'
import { announcementSchema } from './schema'

const TEST_SUBJECT_PREFIX = '[Test] '

/* The owner's email to every family of one reunion. requireOwner in the load AND in every action:
   a layout load runs after an action, so nothing else guards them. */
export const load: PageServerLoad = async (event) => {
    requireOwner(event)
    const { eventId } = event.params

    const [confirmed, everyoneActive, sent] = await Promise.all([
        getAnnouncementRecipients(eventId, 'confirmed'),
        getAnnouncementRecipients(eventId, 'everyone_active'),
        getAnnouncementsForEvent(eventId),
    ])

    return {
        recipientCounts: { confirmed: confirmed.length, everyone_active: everyoneActive.length },
        /* The addresses stay on the server; the page needs only how many. */
        announcements: sent.map(({ recipients, ...announcement }) => ({
            ...announcement,
            recipientCount: recipients.length,
        })),
    }
}

/* The reunion an action writes for, refused once archived: an archived year is a record. */
async function sendableEvent(eventId: string) {
    const [found] = await db
        .select({ title: reunionEvents.title, status: reunionEvents.status })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    if (!found) {
        throw error(404, 'Event not found')
    }
    return found
}

async function parseMessage(event: RequestEvent) {
    const formData = await event.request.formData()
    return {
        formData,
        parsed: announcementSchema.safeParse({
            subject: formData.get('subject') ?? '',
            body: formData.get('body') ?? '',
            audience: formData.get('audience') ?? '',
        }),
    }
}

function invalid(message: string | undefined) {
    const feedback: AnnouncementFeedback = { error: message ?? 'Check the message and try again' }
    return fail(400, feedback)
}

export const actions: Actions = {
    /* Renders the email exactly as families will get it, for the iframe. Sends nothing. */
    preview: async (event) => {
        requireOwner(event)
        const found = await sendableEvent(event.params.eventId)
        const { parsed } = await parseMessage(event)
        if (!parsed.success) {
            return invalid(parsed.error.issues[0]?.message)
        }
        const feedback: AnnouncementFeedback = {
            previewHtml: renderAnnouncement({
                eventTitle: found.title,
                subject: parsed.data.subject,
                body: parsed.data.body,
                siteOrigin: event.url.origin,
            }).html,
        }
        return feedback
    },

    /* Sends one copy to the owner's own address, marked as a test. Records nothing. */
    send_test: async (event) => {
        const owner = requireOwner(event)
        const found = await sendableEvent(event.params.eventId)
        const { parsed } = await parseMessage(event)
        if (!parsed.success) {
            return invalid(parsed.error.issues[0]?.message)
        }
        try {
            await sendAnnouncement({
                announcementId: `test-${randomUUID()}`,
                recipients: [owner.email],
                data: {
                    eventTitle: found.title,
                    subject: `${TEST_SUBJECT_PREFIX}${parsed.data.subject}`,
                    body: parsed.data.body,
                    siteOrigin: event.url.origin,
                },
                alreadySent: 0,
                onProgress: async () => {},
            })
        } catch (err) {
            reportError('announcement test send failed', err, { eventId: event.params.eventId })
            const feedback: AnnouncementFeedback = { error: 'The test email could not be sent.' }
            return fail(502, feedback)
        }
        const feedback: AnnouncementFeedback = { testSentTo: owner.email }
        return feedback
    },

    /* Sends to every family in the audience. confirmCount is the number the owner was shown and
       ticked; if bookings changed since, the list differs and the owner is asked to look again. */
    send: async (event) => {
        const owner = requireOwner(event)
        const found = await sendableEvent(event.params.eventId)
        if (found.status === 'archived') {
            return invalid('This reunion is archived. Nothing can be sent from it.')
        }
        const { formData, parsed } = await parseMessage(event)
        if (!parsed.success) {
            return invalid(parsed.error.issues[0]?.message)
        }
        const recipients = await getAnnouncementRecipients(
            event.params.eventId,
            parsed.data.audience,
        )
        if (recipients.length === 0) {
            return invalid('Nobody is in that group yet.')
        }
        if (formData.get('confirmCount') !== String(recipients.length)) {
            return invalid(
                `The list is now ${recipients.length} families. Check the count and confirm again.`,
            )
        }

        const announcementId = await createAnnouncement({
            eventId: event.params.eventId,
            ...parsed.data,
            recipients,
            sender: owner,
        })
        const result = await deliverAnnouncement({
            announcementId,
            eventId: event.params.eventId,
            eventTitle: found.title,
            siteOrigin: event.url.origin,
            retry: false,
        })
        const feedback: AnnouncementFeedback = { sent: result }
        return feedback
    },

    /* Resumes a failed announcement from its last finished batch, to the list it was first sent to. */
    retry: async (event) => {
        requireOwner(event)
        const found = await sendableEvent(event.params.eventId)
        if (found.status === 'archived') {
            return invalid('This reunion is archived. Nothing can be sent from it.')
        }
        const announcementId = (await event.request.formData()).get('announcementId')
        const result =
            typeof announcementId === 'string' && isUuid(announcementId)
                ? await deliverAnnouncement({
                      announcementId,
                      eventId: event.params.eventId,
                      eventTitle: found.title,
                      siteOrigin: event.url.origin,
                      retry: true,
                  })
                : undefined
        if (!result) {
            return invalid('That email is not waiting to be retried.')
        }
        const feedback: AnnouncementFeedback = { sent: result }
        return feedback
    },
}
