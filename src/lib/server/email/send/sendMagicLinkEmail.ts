import { dbg } from '$lib/server/debug'
import { renderMagicLinkEmail } from '../templates'
import { send } from './_resend'

// Sends a magic link sign-in email to the given address.
export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
    dbg.email('sendMagicLinkEmail to=%s', to)
    const { subject, text } = renderMagicLinkEmail(url)
    await send(to, subject, text)
}
