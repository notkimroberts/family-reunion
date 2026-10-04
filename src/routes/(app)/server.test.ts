import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'

/* The home page is public. The program content in `metadata` is behind the login on /program, so it
   must not reach a stranger through this load either — page source is readable whether or not the
   page renders it. */

const { load } = await import('./+page.server')

type HomeLoadEvent = Parameters<typeof load>[0]

let db: Awaited<ReturnType<typeof resetTestDb>>

describe('GET /', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('sends the open event without its program metadata', async () => {
        const eventId = await seedEvent(db)
        await db
            .update(reunionEvents)
            .set({ metadata: { venue: { name: 'Oakstop' } } })
            .where(eq(reunionEvents.id, eventId))

        const result = await load({} as HomeLoadEvent)

        if (!result?.event) {
            throw new Error('expected the open event to load')
        }
        expect(result.event.title).toBe('Patterson Family Reunion 2027')
        expect(result.event).not.toHaveProperty('metadata')
    })
})
