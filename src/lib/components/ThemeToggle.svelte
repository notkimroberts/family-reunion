<script lang="ts">
import { Moon, Sun } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { LIGHT_THEME } from '$lib/general/constants'
import { theme } from '$lib/stores/theme'

type Props = {
    size?: 'sm' | 'md'
}

let { size = 'md' }: Props = $props()

const iconSize = $derived(size === 'sm' ? 16 : 20)
</script>

<Button variant="ghost" size="icon" onclick={() => theme.toggle()} aria-label="Toggle theme">
    {#if $theme === LIGHT_THEME}
        <Moon size={iconSize} />
    {:else}
        <Sun size={iconSize} />
    {/if}
</Button>
