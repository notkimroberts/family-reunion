<script lang="ts">
import ShirtCard from './ShirtCard.svelte'
import ToteCard from './ToteCard.svelte'

// Shirt (two columns) beside tote, shared by / and /register.
let { class: className = '' }: { class?: string } = $props()
</script>

<div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3 {className}">
    <ShirtCard />
    <ToteCard />
</div>
