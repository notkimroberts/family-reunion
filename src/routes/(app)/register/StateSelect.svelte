<script lang="ts">
import * as Select from '$lib/components/ui/select'
import { US_STATES } from '$lib/general/constants'

let {
    value = $bindable(''),
    id,
    name,
}: {
    value: string
    id?: string
    name?: string
} = $props()

let selected = $derived(US_STATES.find((s) => s.value === value))
</script>

<Select.Root type="single" {value} onValueChange={(v) => (value = v)} {name}>
    <Select.Trigger {id} class="w-full">
        {#if selected}
            {selected.label}
        {:else}
            <span class="text-muted-foreground">Select state…</span>
        {/if}
    </Select.Trigger>
    <Select.Content class="max-h-72">
        {#each US_STATES as state (state.value)}
            <Select.Item value={state.value} label={state.label} />
        {/each}
    </Select.Content>
</Select.Root>
