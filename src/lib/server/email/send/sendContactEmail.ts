import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import { renderContactEmail } from '../templates'
import { send } from './_resend'

// Forwards a contact-form submission to the admin address defined in ADMIN_EMAIL.
export async function sendContactEmail(
    from: { name: string; email: string },
    message: string,
): Promise<void> {
    dbg.email('sendContactEmail from=%s', from.email)
    const { subject, text } = renderContactEmail(from, message)
    await send(env.ADMIN_EMAIL!, subject, text)
}
