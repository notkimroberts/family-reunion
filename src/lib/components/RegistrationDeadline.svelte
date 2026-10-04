<script lang="ts">
import { CalendarClock } from '@lucide/svelte'
import { isRegistrationClosed } from '$lib/general/registration'
import { formatReunionDateTime } from '$lib/utils'

/* The date registration closes, said on the pages a registrant actually looks at — the home page and
   the register form. The lock date has always been enforced (assertRegistrationEditable, from
   createPendingRegistration) but was never shown, so the first anyone heard of it was a closed form.

   A muted line, day only: it sat under the Register button as a yellow pill with the hour and zone,
   and outshouted the button it qualifies.

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
    <p class="text-muted-foreground inline-flex items-center gap-1.5 text-sm {className}">
        <CalendarClock class="size-3.5 shrink-0" />
        <span>
            {closed ? 'Registration closed on' : 'Registration closes'}
            <span class="text-foreground font-medium"
                >{formatReunionDateTime(lockDate, 'date')}</span>
        </span>
    </p>
{/if}
