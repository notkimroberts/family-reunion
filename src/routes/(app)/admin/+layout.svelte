<script lang="ts">
import { AdminHeader } from '$lib/components'

let { data, children } = $props()
</script>

<!-- The sidebar, the year-pill row and the 'admin' Svelte context all lived here. All three are gone:
     seven destinations became two tabs plus Setup, and the year moved into the URL, so there is nothing
     left to hold in context.

     The 12-column grid wrappers stay. Every Setup page section is col-span-12 or xl:col-span-8 and
     resolves against them, and they are also the only source of vertical spacing between those
     sections. -->
<AdminHeader
    events={data.events}
    currentEventId={data.currentEventId}
    userName={data.user.name}
    isOwner={data.isOwner} />

{@render children()}
