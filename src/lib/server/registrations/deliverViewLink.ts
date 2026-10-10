import { generateViewToken } from './hashViewToken'
import { rotateViewToken } from './rotateViewToken'

/* 'skipped' means the caller decided there was nothing to send after all. Nothing is rotated, so
   the registrant's existing link keeps working. */
export type ViewLinkDelivery = 'sent' | 'skipped'

/* Issues a fresh view link and rotates the stored hash ONLY after delivery is confirmed.

   Rotation is unavoidable whenever a link has to be re-sent: the database stores only
   sha256(token), so nobody — not even an organiser — can recover the original plaintext. Which
   makes the ORDER the whole safety property. Rotate first and a failed send leaves the registrant
   with an old link that no longer hashes to anything stored and a new one they never received:
   locked out of a paid booking, permanently, with no way back in.

   That bug shipped once. The Resend SDK resolves with `{ data, error }` rather than throwing, and
   send() was not inspecting it, so a failure looked like a success and the rotation went ahead.
   send() now throws, which is what makes this ordering effective rather than decorative.

   The ordering used to be written out three times — the organiser's re-issue, the update
   notification, and /register/recover — each with a paragraph of comment explaining it and nothing
   enforcing it. Here it is structural: `deliver` never receives the hash, so a caller cannot rotate
   early even by mistake. It gets the plaintext, builds whatever URL and email it likes, and either
   returns 'sent' or throws.

   Rotation demotes the outgoing hash rather than discarding it, so the link the registrant was sent
   before this one keeps working for the grace period, and an open view tab whose cookie holds that
   plaintext survives. Only links two generations old stop working — see isViewTokenValid. */
export async function deliverViewLink(params: {
    registrationId: string
    deliver: (viewToken: string) => Promise<ViewLinkDelivery>
}): Promise<ViewLinkDelivery> {
    const { plaintext, hash } = generateViewToken()

    const delivery = await params.deliver(plaintext)

    if (delivery === 'skipped') {
        return 'skipped'
    }

    await rotateViewToken({ registrationId: params.registrationId, newHash: hash })
    return 'sent'
}
