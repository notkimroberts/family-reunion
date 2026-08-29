<script lang="ts">
import { Badge } from '$lib/components/ui/badge'
import type { RegistrationStatus } from '$lib/utils'
import { REGISTRATION_STATUS_STYLES } from './registrationStatusStyles'

let { status }: { status: RegistrationStatus } = $props()

/* No cast and no fallback. The prop is the database's own union, so every key is present — the old
   `?? pending` quietly rendered an unrecognised status as "Pending", which for a money status is the
   worst possible guess. */
let style = $derived(REGISTRATION_STATUS_STYLES[status])
/* Capitalised so it can be used as a component. {@const} cannot live at the top level of markup. */
let Icon = $derived(style.icon)
</script>

<Badge variant="outline" class="gap-1 {style.class}">
    <Icon class="size-3" />
    {style.label}
</Badge>
