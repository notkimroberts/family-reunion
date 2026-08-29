<script lang="ts">
import { enhance } from '$app/forms'

/* One field of one attendee, in its own form.

   Its own form, per cell, because a <form> is not valid as a child of <tr> — the HTML parser hoists it out
   of the table and the controls escape the row. A form inside a <td> is fine, so each cell owns one. That
   also means a change posts exactly one field, and the action writes only what it was sent.

   requestSubmit(), never submit(). HTMLFormElement.submit() dispatches no submit event, so use:enhance
   would never run and every change would be a full page POST — the same trap the Setup events page
   already carries a comment about.

   No save button. With one control and a round trip per change there is nothing to batch, and a button is
   one more thing to leave unpressed before navigating away. */
let {
    memberId,
    personName,
    field,
    label,
    value,
    kind,
}: {
    memberId: string
    personName: string
    field: 'birthDate' | 'vegetarianMeal' | 'attendedReunion2025'
    label: string
    value: string
    kind: 'date' | 'yesno'
} = $props()

let saving = $state(false)

function handleChange(changed: Event) {
    ;(changed.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit()
}

const CONTROL_CLASS =
    'h-8 w-full rounded-md border border-input bg-transparent px-1.5 text-base md:text-xs disabled:opacity-50'
</script>

<form
    method="POST"
    action="?/update_person"
    use:enhance={() => {
        saving = true
        return async ({ update }) => {
            /* update() re-runs the load, so the cell, the head counts and the order summary in the
               sidebar all move together. Without it the summary would disagree with what you just set. */
            await update({ reset: false })
            saving = false
        }
    }}>
    <input type="hidden" name="memberId" value={memberId} />
    {#if kind === 'date'}
        <input
            type="date"
            name={field}
            aria-label="{label} for {personName}"
            disabled={saving}
            {value}
            onchange={handleChange}
            class={CONTROL_CLASS} />
    {:else}
        <select
            name={field}
            aria-label="{label} for {personName}"
            disabled={saving}
            {value}
            onchange={handleChange}
            class={CONTROL_CLASS}>
            <!-- Disabled, not selectable: updateAdminMemberDetails reads an absent value as "leave this
                 alone" and has no way to express "set it back to null", so unanswered is a prompt rather
                 than a choice that would silently do nothing. -->
            <option value="" disabled>—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
        </select>
    {/if}
</form>
