import { z } from 'zod'
import { command, getRequestEvent } from '$app/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { setMemberCheckedIn } from '$lib/server/registrations'

const checkinInput = z.object({
    memberId: z.string().uuid(),
    eventId: z.string().uuid(),
    checkedIn: z.boolean(),
})

/* The door's one write, called from an onclick rather than a form: the check-in list needs a tick per
   person per state, and a <form> around each of them buys nothing here — this page requires JavaScript
   to be useful at all, since its whole value is that the tick lands before the greeter looks up.

   requireAdmin is called INSIDE the function, not in a layout. Remote functions are served from
   /_app/remote/<id> with route handling skipped entirely, so no layout or page guard ever sees this
   request and the in-function guard is the whole protection.

   eventId comes from the payload, not from `params`: inside a remote function `params` describes the
   page the call came from and is client-controllable, so it must never decide authorisation. The server
   function pairs the member against it and 404s on a mismatch. */
export const setCheckedIn = command(checkinInput, async ({ memberId, eventId, checkedIn }) => {
    const admin = requireAdmin(getRequestEvent())

    return setMemberCheckedIn({ memberId, eventId, checkedIn, adminId: admin.id })
})
