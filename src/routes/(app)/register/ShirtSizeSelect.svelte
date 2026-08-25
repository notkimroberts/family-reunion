<script lang="ts">
import { NativeSelect } from '$lib/components/ui/native-select'
import { SHIRT_SIZES } from '$lib/general/constants'

/* Was four inline copies of the same Select across the registration forms, differing only in the
   empty option's label. */
let {
    value = $bindable(''),
    id,
    name,
    emptyLabel = 'Select size…',
}: {
    value: string
    id?: string
    name?: string
    emptyLabel?: string
} = $props()
</script>

<NativeSelect {id} {name} bind:value>
    <!-- A shirt is optional, so the empty option stays selectable. -->
    <option value="">{emptyLabel}</option>
    {#each SHIRT_SIZES as size (size)}
        <option value={size}>{size}</option>
    {/each}
</NativeSelect>
