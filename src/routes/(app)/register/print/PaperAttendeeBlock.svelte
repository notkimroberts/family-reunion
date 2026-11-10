<script module lang="ts">
const GROUP_LABEL = 'text-[9px] font-semibold uppercase tracking-widest text-neutral-500'
</script>

<script lang="ts">
import type { TierOption } from '../types'
import PaperAttendeeAnswers from './PaperAttendeeAnswers.svelte'
import PaperBirthDate from './PaperBirthDate.svelte'

/* One guest, written into a block rather than a table row. The table this replaced fitted five
   people on one page by giving each name 150px and each answer an unlabeled 22px cell — legible
   to read, unwritable to fill in with a pen. A block gives the name a 4in rule and every answer a
   labeled tick box, and the sheet is allowed to run to a second page. The contact's own answers are
   in section 1, so every block here is someone else. */
let { index, tiers }: { index: number; tiers: TierOption[] } = $props()
</script>

<!-- data-paper-attendee: the print rules in app.css re-assert break-inside-avoid against this
     attribute, because the Tailwind class alone was ignored while this div was a flex item. -->
<div
    data-paper-attendee
    class="flex break-inside-avoid flex-col gap-1.5 border border-neutral-500 px-2 py-1.5">
    <div class="flex items-end gap-2">
        <span
            class="flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-neutral-700 text-[10px] font-bold">
            {index}
        </span>
        <div class="flex flex-1 flex-col gap-0.5">
            <span class={GROUP_LABEL}>Full name</span>
            <div class="h-7 border-b border-neutral-500"></div>
        </div>
        <PaperBirthDate />
    </div>
    <PaperAttendeeAnswers {tiers} />
</div>
