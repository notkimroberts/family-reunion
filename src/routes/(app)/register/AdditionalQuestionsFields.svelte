<script lang="ts">
import YesNoSelect from './YesNoSelect.svelte'

let {
    idPrefix,
    vegetarianMeal = $bindable(''),
    attendedReunion2025 = $bindable(''),
    withFieldNames = false,
}: {
    idPrefix: string
    vegetarianMeal: 'yes' | 'no' | ''
    attendedReunion2025: 'yes' | 'no' | ''
    withFieldNames?: boolean
} = $props()
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
        <label for="{idPrefix}-vegetarian" class="text-sm font-medium">
            Vegetarian meal? <span class="text-destructive">*</span>
        </label>
        <YesNoSelect
            id="{idPrefix}-vegetarian"
            name={withFieldNames ? 'vegetarianMeal' : undefined}
            bind:value={vegetarianMeal} />
    </div>
    <div class="space-y-1.5">
        <label for="{idPrefix}-attended2025" class="text-sm font-medium">
            Attended the 2025 New Orleans reunion?
            <span class="text-destructive">*</span>
        </label>
        <YesNoSelect
            id="{idPrefix}-attended2025"
            name={withFieldNames ? 'attendedReunion2025' : undefined}
            bind:value={attendedReunion2025} />
    </div>
</div>
