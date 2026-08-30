import { env } from '$env/dynamic/private'
import { requireAdmin } from '$lib/server/auth/guards'
import { isOwner } from '$lib/server/auth/isOwner'
import type { LayoutServerLoad } from './$types'

/* The admin shell's load. Two values and no queries.

   It used to return `events` — every reunion year, four columns — for the year picker in the
   registrations sidebar and, before that, for a row of year pills. The picker is gone: switching years
   is what /admin is for, and that page lists every reunion with its head count and money on it, which
   is more use for choosing between them than a select showing only years.

   So the query went with it. /admin has its own `events` from getEventSummaries, which shadowed this one
   in page data anyway — this ran on every admin page load and was read by nothing. `currentEventId`
   went the same way when the Setup area was deleted, for the same reason: it answered a question only
   Setup asked. */
export const load: LayoutServerLoad = async (event) => {
    const user = requireAdmin(event)

    return {
        user,
        /* Drives whether the registrations page offers the Event settings link. The server still
           guards the settings load and every action there — this only stops advertising a door that
           will not open. */
        isOwner: isOwner(user, env.OWNER_EMAIL),
    }
}
