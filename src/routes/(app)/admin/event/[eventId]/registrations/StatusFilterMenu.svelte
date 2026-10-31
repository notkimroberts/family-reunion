<script lang="ts">
import { ChevronDown, ListFilter } from '@lucide/svelte'
import { buttonVariants } from '$lib/components/ui/button'
import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
import { REGISTRATION_STATUS_STYLES } from '$lib/general/constants/REGISTRATION_STATUS_STYLES'
import { cn, type DisplayStatus } from '$lib/utils'

type Props = {
    value: DisplayStatus | undefined
}

/* Order is a decision — money in, money owed, comped, cancelled — so it is spelled out rather than
   taken from the style map's keys, which would also widen the union back to string. Partly paid is a
   shown status, not a stored one (getBookingDisplayStatus), and sits between the two it is made of. */
const STATUS_FILTERS: DisplayStatus[] = ['paid', 'partly_paid', 'pending', 'waived', 'refunded']

// The radio group's value is a string; "All" is not a status, so it gets a sentinel.
const ALL_VALUE = 'all'

let { value = $bindable() }: Props = $props()

let selectedStyle = $derived(value ? REGISTRATION_STATUS_STYLES[value] : undefined)

// Maps the sentinel back to undefined; any other value is one of STATUS_FILTERS.
function handleValueChange(next: string) {
    value = STATUS_FILTERS.find((status) => status === next)
}
</script>

<DropdownMenu.Root>
    <!-- The trigger wears the chosen status's badge colors, so a filtered list cannot pass for the
         whole list. -->
    <DropdownMenu.Trigger
        class={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'gap-1.5',
            selectedStyle?.class,
        )}>
        {#if selectedStyle}
            <selectedStyle.icon class="size-3.5" />
            {selectedStyle.label}
        {:else}
            <ListFilter class="size-3.5" />
            All statuses
        {/if}
        <ChevronDown class="size-3.5 opacity-60" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="start" class="w-44">
        <DropdownMenu.RadioGroup value={value ?? ALL_VALUE} onValueChange={handleValueChange}>
            <DropdownMenu.RadioItem value={ALL_VALUE}>All statuses</DropdownMenu.RadioItem>
            <DropdownMenu.Separator />
            {#each STATUS_FILTERS as status (status)}
                {@const statusStyle = REGISTRATION_STATUS_STYLES[status]}
                <!-- Same icon and text color the row badge wears, so the menu doubles as the legend. -->
                <DropdownMenu.RadioItem value={status}>
                    <span
                        class={cn(
                            'inline-flex items-center gap-1 rounded-full border px-1.5 text-xs leading-5 font-medium',
                            statusStyle.class,
                        )}>
                        <statusStyle.icon class="size-3" />
                        {statusStyle.label}
                    </span>
                </DropdownMenu.RadioItem>
            {/each}
        </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
</DropdownMenu.Root>
