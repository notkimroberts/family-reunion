import { z } from 'zod'
import { command, getRequestEvent } from '$app/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { setShirtGiven } from '$lib/server/registrations'

const shirtInput = z.object({
    memberId: z.string().uuid(),
    eventId: z.string().uuid(),
    given: z.boolean(),
})

/* The second door write: this person has their shirt.

   Guarded in-function like the check-in command — remote functions are served from /_app/remote/<id>
   with route handling skipped, so no layout or page guard ever sees this request. eventId comes from the
   payload rather than `params`, which inside a remote function describes the calling page and is
   client-controllable; the server function pairs the member against it. */
export const setShirtHandedOver = command(shirtInput, async ({ memberId, eventId, given }) => {
    requireAdmin(getRequestEvent())

    return setShirtGiven({ memberId, eventId, given })
})
