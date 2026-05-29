<script lang="ts">
import type { Snippet } from 'svelte'

interface Props {
    mobileCards: Snippet
    desktopTable: Snippet
}

let { mobileCards, desktopTable }: Props = $props()
</script>

<div class="md:hidden">
    {@render mobileCards()}
</div>
<div class="hidden md:block">
    {@render desktopTable()}
</div>
