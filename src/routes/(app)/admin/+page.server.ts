import { fail } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { requireAdmin, requireOwner } from '$lib/server/auth/guards'
import { isOwner } from '$lib/server/auth/isOwner'
import { db } from '$lib/server/db'
import { reunionEvents, tiers } from '$lib/server/db/schema'
import { getEventSummaries } from '$lib/server/registrations'
import type { PageServerLoad, Actions } from './$types'

/* /admin is the way in — /login sends you here, and it is the only entry point into the admin area
   anywhere in the app. It lists the reunions and is where a new one is created.

   It was briefly a redirect straight to the open event's registrations, which was wrong twice over: it
   made the other years invisible, so there was no way to see that 2025 collected more than 2027 is
   collecting, and it made the sign-in destination depend on which event happens to be open — a state that
   changes twice a year. Landing on the list is one extra click and no guessing.

   Creating a year lives HERE rather than behind a Setup area, because this is the page that shows you
   the years. The old /admin/setup and /admin/setup/events were a landing page whose only remaining
   purpose was linking to this action and to a per-event settings page the year cards already link to. */
export const load: PageServerLoad = async (event) => {
    const user = requireAdmin(event)

    return {
        events: await getEventSummaries(),
        /* Whether to offer the create form at all. Hiding is not the protection — the action guards
           itself with requireOwner — this only stops advertising a control that will refuse. */
        isOwner: isOwner(user, env.OWNER_EMAIL),
    }
}

/* The current year, so the form can suggest one without hard-coding a date. Read at request time
   rather than at module load: a process that stays up over New Year would otherwise keep suggesting
   the old year. */
const currentYear = () => new Date().getFullYear()

export const actions: Actions = {
    /* Creates a reunion year in 'draft', with starter Adult and Child tiers at $0.

       Owner-only, like everything that used to live under /admin/setup. A layout load runs AFTER a form
       action, so the guard has to be in the action itself — there is no parent load that can cover it. */
    create_event: async (event) => {
        requireOwner(event)

        const data = await event.request.formData()
        const title = String(data.get('title') ?? '').trim()
        const yearRaw = String(data.get('year') ?? '').trim()

        if (!title) {
            return fail(400, { createError: 'Give the reunion a title.' })
        }

        const year = Number(yearRaw)
        /* Number('') is 0 and Number('20x7') is NaN, so both need catching before the insert. The
           bounds are deliberately wide — a reunion recorded retrospectively is legitimate — but a
           typo'd 207 or 20227 is not a year anyone means. */
        if (!Number.isInteger(year) || year < 1900 || year > currentYear() + 50) {
            return fail(400, { createError: 'That does not look like a year.' })
        }

        const [reunionEvent] = await db
            .insert(reunionEvents)
            .values({ title, year, status: 'draft' })
            .returning()

        /* Starter tiers so the event is immediately registrable once priced. Created here rather than
           left to the settings page because a year with no tiers cannot accept a registration at all,
           and nothing else would tell you that was why. */
        await db.insert(tiers).values([
            { eventId: reunionEvent.id, label: 'Adult', priceCents: 0 },
            { eventId: reunionEvent.id, label: 'Child', priceCents: 0 },
        ])

        /* Straight to its settings: a draft year with $0 tiers is not usable until it is priced, so
           landing back on the list would leave the next step unstated. */
        return { createdEventId: reunionEvent.id, createdTitle: title }
    },
}
