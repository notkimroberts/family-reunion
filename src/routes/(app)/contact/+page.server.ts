import { fail } from '@sveltejs/kit'
import { db } from '$lib/server/db'
import { contactSubmissions } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendContactEmail } from '$lib/server/email'
import type { Actions } from './$types'

const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const window = 60 * 60 * 1000 // 1 hour
    const maxRequests = 3

    const requests = rateLimitMap.get(ip) ?? []
    const recent = requests.filter((t) => now - t < window)
    rateLimitMap.set(ip, recent)

    if (recent.length >= maxRequests) return true
    recent.push(now)
    rateLimitMap.set(ip, recent)
    return false
}

export const actions: Actions = {
    default: async ({ request, getClientAddress }) => {
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

        await db.insert(contactSubmissions).values({
            name: name.trim(),
            email: email.trim(),
            message: message.trim(),
        })

        await sendContactEmail({ name: name.trim(), email: email.trim() }, message.trim())

        return { success: true }
    },
}
