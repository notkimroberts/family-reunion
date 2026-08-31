import { fail, redirect } from '@sveltejs/kit'
import { desc } from 'drizzle-orm'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, tiers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import type { Actions, PageServerLoad } from './$types'

/* Creating a reunion year, on its own page.

   It was a panel that expanded in place above the year cards on /admin, which put a form between the
   heading and the list every time it opened and pushed the cards you were reading down the screen. A
   create form is a destination, not a mode: the same shape as /admin/event/[eventId]/registrations/new,
   which is how you add a paper registration.

   Owner-only in the load AND in the action. requireOwner in the load turns a non-owner away at the door
   rather than showing them a form that will refuse them; the guard in the action is the one that
   actually protects the insert, because a layout load runs AFTER a form action. */

/* Read at request time, not at module load: a process that stays up over New Year would otherwise keep
   suggesting the old year. */
const currentYear = () => new Date().getFullYear()

export const load: PageServerLoad = async (event) => {
    requireOwner(event)

    /* Seeded from the newest year rather than left blank. The title is the same string every reunion
       and the year is almost always the next one, so a blank form asked the owner to retype what the
       row above already said. max(year) + 1 also avoids proposing a year that exists — nothing in the
       schema stops two 2027s, only one event may be `open`. */
    const [latest] = await db
        .select({ title: reunionEvents.title, year: reunionEvents.year })
        .from(reunionEvents)
        .orderBy(desc(reunionEvents.year))
        .limit(1)

    return {
        suggestedTitle: latest?.title ?? '',
        suggestedYear: (latest?.year ?? currentYear()) + 1,
    }
}

export const actions: Actions = {
    /* Creates the year in 'draft' with starter Adult and Child tiers at $0, then goes straight to its
       settings: a draft with $0 tiers cannot take a registration, and the year list would not say so.

       A real redirect, not a flag for the page to act on. The version on /admin returned
       { createdEventId } and let an $effect call goto(), because a redirect would have navigated away
       from the list before a fail() could render on it. On a page of its own that tension is gone —
       fail() renders here, success leaves. */
    default: async (event) => {
        requireOwner(event)

        const data = await event.request.formData()
        const title = String(data.get('title') ?? '').trim()
        const yearRaw = String(data.get('year') ?? '').trim()

        if (!title) {
            return fail(400, { createError: 'Give the reunion a title.', title, year: yearRaw })
        }

        const year = Number(yearRaw)
        /* Number('') is 0 and Number('20x7') is NaN, so both need catching before the insert. The
           bounds are deliberately wide — a reunion recorded retrospectively is legitimate — but a
           typo'd 207 or 20227 is not a year anyone means. */
        if (!Number.isInteger(year) || year < 1900 || year > currentYear() + 50) {
            return fail(400, {
                createError: 'That does not look like a year.',
                title,
                year: yearRaw,
            })
        }

        dbg.admin('create_event title=%s year=%d', title, year)

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

        redirect(303, `/admin/event/${reunionEvent.id}/settings`)
    },
}
