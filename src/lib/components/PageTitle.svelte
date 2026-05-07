<script lang="ts">
import { APP_NAME } from '$lib/general/constants'

type Props = {
    title?: string
}

let { title }: Props = $props()
let value = $derived.by(() => [title, APP_NAME].filter(Boolean).join(' • '))
</script>

<svelte:head>
    <title>{value}</title>
</svelte:head>
