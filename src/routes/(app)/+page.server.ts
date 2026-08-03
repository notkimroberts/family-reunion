import { fail } from '@sveltejs/kit'
import { eq, and, count } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendContactEmail } from '$lib/server/email'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async () => {
    const events = await db.select().from(reunionEvents).where(eq(reunionEvents.status, 'open'))

    if (events.length === 0) {
        return { event: null, registrantCount: 0 }
    }

    const event = events[0]

    const [{ value: registrantCount }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(and(eq(registrations.eventId, event.id), eq(registrations.status, 'paid')))

    return { event, registrantCount }
}

const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const window = 60 * 60 * 1000 // 1 hour
    const maxRequests = 3

    const requests = rateLimitMap.get(ip) ?? []
    const recent = requests.filter((t) => now - t < window)
    rateLimitMap.set(ip, recent)

    if (recent.length >= maxRequests) {
        return true
    }
    recent.push(now)
    rateLimitMap.set(ip, recent)
    return false
}

export const actions: Actions = {
    contact: async ({ request, getClientAddress }) => {
        const data = await request.formData()
        const name = data.get('name') as string
        const email = data.get('email') as string
        const message = data.get('message') as string
        const honeypot = data.get('website') as string

        if (honeypot) {
            dbg.contact('honeypot triggered, returning fake success')
            return { success: true }
        }

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return fail(400, { error: 'All fields are required' })
        }

        const ip = getClientAddress()
        if (isRateLimited(ip)) {
            dbg.contact('rate limited ip=%s', ip)
            return fail(429, { error: 'Too many submissions. Please try again later.' })
        }

        dbg.contact('submission from=%s', email)

        await sendContactEmail({ name: name.trim(), email: email.trim() }, message.trim())

        return { success: true }
    },
}
