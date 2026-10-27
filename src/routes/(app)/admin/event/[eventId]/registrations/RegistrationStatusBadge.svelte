<script lang="ts">
import { Badge } from '$lib/components/ui/badge'
import { REGISTRATION_STATUS_STYLES } from '$lib/general/constants/REGISTRATION_STATUS_STYLES'
import type { DisplayStatus } from '$lib/utils'

/* A shown status, not the stored one: callers pass getBookingDisplayStatus or getPersonDisplayStatus,
   so a booking that still owes does not read Paid. */
let { status }: { status: DisplayStatus } = $props()

/* No cast and no fallback. The prop is DisplayStatus, which the style map covers key for key — the old
   `?? pending` quietly rendered an unrecognized status as "Pending", which for a money status is the
   worst possible guess. */
let style = $derived(REGISTRATION_STATUS_STYLES[status])
/* Capitalized so it can be used as a component. {@const} cannot live at the top level of markup. */
let Icon = $derived(style.icon)
</script>

<Badge variant="outline" class="gap-1 {style.class}">
    <Icon class="size-3" />
    {style.label}
</Badge>
