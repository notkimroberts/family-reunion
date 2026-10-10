<script lang="ts">
import { Check } from '@lucide/svelte'
import type { Component } from 'svelte'
import { toast } from 'svelte-sonner'
import { invalidateAll } from '$app/navigation'
import { Button } from '$lib/components/ui/button'

/* One door fact — arrived, or shirt handed over — as a toggle in an admin table cell.

   NOT optimistic, unlike the check-in page. This is the desk, not the queue: the button disables while
   the request is in flight, so a second tap cannot undo the first, and the row shows the server's answer
   once invalidateAll has reloaded it. */
let {
    isOn,
    onLabel,
    offLabel,
    offIcon: OffIcon,
    ariaLabel,
    errorMessage,
    onToggle,
}: {
    isOn: boolean
    onLabel: string
    offLabel: string
    offIcon: Component
    ariaLabel: string
    errorMessage: string
    onToggle: (next: boolean) => Promise<unknown>
} = $props()

let isPending = $state(false)

async function handleClick() {
    isPending = true
    try {
        await onToggle(!isOn)
        await invalidateAll()
    } catch {
        toast.error(errorMessage)
    } finally {
        isPending = false
    }
}
</script>

<Button
    type="button"
    size="sm"
    variant={isOn ? 'secondary' : 'outline'}
    aria-pressed={isOn}
    aria-label={ariaLabel}
    disabled={isPending}
    onclick={handleClick}>
    {#if isOn}
        <Check class="size-4" />
        {onLabel}
    {:else}
        <OffIcon class="size-4" />
        {offLabel}
    {/if}
</Button>
