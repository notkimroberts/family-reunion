<script lang="ts">
import * as Select from '$lib/components/ui/select'

const LABELS = { yes: 'Yes', no: 'No' } as const

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

<Select.Root type="single" {value} onValueChange={(v) => (value = v as 'yes' | 'no')} {name}>
    <Select.Trigger {id} class="w-full">
        {#if value}
            {LABELS[value]}
        {:else}
            <span class="text-muted-foreground">{allowClear ? clearLabel : placeholder}</span>
        {/if}
    </Select.Trigger>
    <Select.Content>
        {#if allowClear}
            <Select.Item value="" label={clearLabel} />
        {/if}
        <Select.Item value="yes" label="Yes" />
        <Select.Item value="no" label="No" />
    </Select.Content>
</Select.Root>
