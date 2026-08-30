import { z } from 'zod'

/* Everything a reunion shows on /program, in one JSONB column.

   These six things — venue, menu, drinks, sites, activities, schedule — were six columns on
   reunion_events. None of them was ever a predicate: nothing filtered, ordered, joined or indexed on
   any of them, and the only readers were the program page, the settings editor and the two venue
   lines in the confirmation email. Columns earn their place by being queryable; display content that
   changes shape every year does not. Reshaping this is now a JSON edit rather than a migration.

   What stayed a column is what something actually reads as a predicate: `status` (the one_open_event
   partial unique index, getOpenEvent), `year` (the ordering), start/end dates, and
   registration_lock_date (assertRegistrationEditable).

   Every field is optional and the column defaults to {} — an event in draft has none of this yet, and
   the program page already renders each section only when its data is present. */

const venueSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    description: z.string().optional(),
})

/* Sites and activities are the same shape; they render as two halves of one "Things To Do" grid. */
const namedItemSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
})

const scheduleItemSchema = z.object({
    day: z.string().min(1),
    time: z.string().min(1),
    activity: z.string().min(1),
})

/* strict(), not the default: the owner edits this as raw JSON, so a typo'd key is the likeliest
   mistake there is. Passthrough would accept `{"menus": [...]}` and the program page would show
   nothing, with the save reported as successful. */
export const reunionMetadataSchema = z
    .object({
        venue: venueSchema.optional(),
        menu: z.array(z.string().min(1)).optional(),
        drinks: z.array(z.string().min(1)).optional(),
        sites: z.array(namedItemSchema).optional(),
        activities: z.array(namedItemSchema).optional(),
        schedule: z.array(scheduleItemSchema).optional(),
    })
    .strict()

export type ReunionMetadata = z.infer<typeof reunionMetadataSchema>
