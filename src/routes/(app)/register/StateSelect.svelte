<script lang="ts">
import { NativeSelect } from '$lib/components/ui/native-select'
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
</script>

<NativeSelect {id} {name} bind:value>
    <option value="" disabled>Select state…</option>
    {#each US_STATES as state (state.value)}
        <option value={state.value}>{state.label}</option>
    {/each}
</NativeSelect>
