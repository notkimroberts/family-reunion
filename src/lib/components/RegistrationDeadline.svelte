<script lang="ts">
import { CalendarClock } from '@lucide/svelte'
import { WARNING_SURFACE_CLASS } from '$lib/general/constants'
import { isRegistrationClosed } from '$lib/general/registration'
import { formatReunionDateTime } from '$lib/utils'

/* The date registration closes, said on the pages a registrant actually looks at — the home page and
   the register form. The lock date has always been enforced (assertRegistrationEditable, from
   createPendingRegistration) but was never shown, so the first anyone heard of it was a closed form.

   Rendered on the server, so it is on screen in the first paint rather than appearing once the
   browser catches up. That is possible because formatReunionDateTime pins the zone, so the server and
   the browser produce the same string and hydration has nothing to disagree about. */
let {
    lockDate,
    class: className = '',
}: {
    lockDate: Date | string | null
    class?: string
} = $props()

let closed = $derived(isRegistrationClosed(lockDate))
</script>

{#if lockDate}
    <p
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm {WARNING_SURFACE_CLASS} {className}">
        <CalendarClock class="size-4 shrink-0" />
        <span>
            {closed ? 'Registration closed on' : 'Registration closes'}
            <span class="font-semibold">{formatReunionDateTime(lockDate)}</span>
        </span>
    </p>
{/if}
