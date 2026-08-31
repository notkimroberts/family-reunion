<script lang="ts">
import { NativeSelect } from '$lib/components/ui/native-select'
import { ADULT_SHIRT_SIZES, YOUTH_SHIRT_SIZES } from '$lib/general/constants'

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
    <!-- Disabled, not selectable: a size is required, so the blank is a prompt rather than an answer.
         Rows recorded before sizes were collected still render it, which is how they surface. -->
    <option value="" disabled>{emptyLabel}</option>
    <!-- Grouped, because the sizes are one flat list of codes: "YS" next to "S" with no heading is
         read as a typo rather than a youth small. -->
    <optgroup label="Youth">
        {#each YOUTH_SHIRT_SIZES as size (size)}
            <option value={size}>{size}</option>
        {/each}
    </optgroup>
    <optgroup label="Adult">
        {#each ADULT_SHIRT_SIZES as size (size)}
            <option value={size}>{size}</option>
        {/each}
    </optgroup>
</NativeSelect>
