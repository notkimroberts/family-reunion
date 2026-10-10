import type { SubmitFunction } from '@sveltejs/kit'

/* use:enhance for a form that edits stored values in place.

   Default enhance calls form.reset() on success, and reset reverts each field to its defaultValue.
   Svelte strips the `value` attribute at hydration (and never sets it on a client render), so that
   default is '' — a successful Save blanks the field it just saved, and the next Save posts the
   blank and clears the stored value. */
export const keepValuesOnSave: SubmitFunction =
    () =>
    async ({ update }) => {
        await update({ reset: false })
    }
