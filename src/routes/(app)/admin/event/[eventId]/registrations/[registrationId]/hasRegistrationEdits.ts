import type { Infer } from 'sveltekit-superforms'
import type { MemberRow } from './memberRow'
import type { adminEditRegistrationSchema } from './schema'

type EditableRegistration = Infer<typeof adminEditRegistrationSchema>

/* Whether anything in the edit form differs from what was loaded — the predicate behind whether Save
   is offered at all.

   Extracted for the same reason isContactComplete was: the editing surface is four separate pieces of
   state ($form for contact and status, `rows`, the removal set, the staged additions), so the answer
   is real logic rather than one field's truthiness, and a `$derived` expression inside a component
   cannot be unit tested.

   Only the contact and status fields of the form are compared, never form.members. onSubmit writes
   the staged rows INTO form.members, so after a refused save (a reprice on a paid party) comparing
   that would report the pending edits as already applied and take Save away with the work unsaved.
   `rows` is the editing surface and is compared directly.

   Members compare by JSON rather than field by field: stringify covers every property, so a field
   added to MemberRow is included automatically. Listing them by hand would leave the next one
   unwatched, and a missed field means a genuine edit that Save refuses to submit — the one failure
   here with a real cost. The reverse error is harmless: clearing an unset birthday from undefined to
   '' reads as a change, and the save then reports that nothing was different. */
export function hasRegistrationEdits(edit: {
    form: EditableRegistration
    initialForm: EditableRegistration
    rows: MemberRow[]
    initialRows: MemberRow[]
    removedCount: number
    newMemberCount: number
}): boolean {
    const { form, initialForm, rows, initialRows, removedCount, newMemberCount } = edit
    return (
        form.contactName !== initialForm.contactName ||
        form.contactEmail !== initialForm.contactEmail ||
        /* Optional in the schema and '' from the loader, so the two spellings of "no phone" must not
           read as an edit. */
        (form.contactPhone ?? '') !== (initialForm.contactPhone ?? '') ||
        form.status !== initialForm.status ||
        JSON.stringify(rows) !== JSON.stringify(initialRows) ||
        removedCount > 0 ||
        newMemberCount > 0
    )
}
