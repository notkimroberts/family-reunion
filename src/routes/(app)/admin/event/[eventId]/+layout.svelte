<script lang="ts">
import { EventStatusBanner } from '$lib/components'

let { data, children } = $props()
</script>

<!-- Rendered once for the whole event subtree, so "should appear on all related views" is structural
     rather than something each page has to remember. Renders nothing at all for an open event, which is
     why the positioning class is passed in rather than wrapped around it. -->
<EventStatusBanner status={data.event.status} class="col-span-12" />

{@render children()}
