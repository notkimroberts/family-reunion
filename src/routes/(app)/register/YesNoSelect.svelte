<script lang="ts">
import { NativeSelect } from '$lib/components/ui/native-select'

let {
    value = $bindable<'yes' | 'no' | ''>(''),
    id,
    name,
    placeholder = 'Select…',
    allowClear = false,
    clearLabel = 'Not answered',
}: {
    value: 'yes' | 'no' | ''
    id?: string
    name?: string
    placeholder?: string
    allowClear?: boolean
    clearLabel?: string
} = $props()
</script>

<NativeSelect {id} {name} bind:value>
    <!-- Selectable where the field may be left unanswered, a disabled prompt where it may not. -->
    <option value="" disabled={!allowClear}>{allowClear ? clearLabel : placeholder}</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
</NativeSelect>
