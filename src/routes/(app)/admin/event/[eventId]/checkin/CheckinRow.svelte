<script lang="ts">
import { Check, Shirt } from '@lucide/svelte'
import type { EventPerson } from '$lib/server/registrations'
import { cn, formatReunionDateTime } from '$lib/utils'

type Props = {
    person: EventPerson
    arrived: boolean
    shirtGiven: boolean
    pending: boolean
    shirtPending: boolean
    onToggle: (person: EventPerson) => void
    onToggleShirt: (person: EventPerson) => void
}

let { person, arrived, shirtGiven, pending, shirtPending, onToggle, onToggleShirt }: Props =
    $props()
</script>

<!-- Two controls, side by side, because arriving and getting a shirt are two facts: shirts run out, or a
     box turns up late, and a single tick could not say which of the two happened. -->
<div
    class={cn(
        'flex items-center gap-2 rounded-md transition-colors',
        arrived ? 'bg-primary/10' : 'hover:bg-muted',
    )}>
    <!-- The name is the arrival target, and it is the whole left side of the row: a greeter is holding a
         phone in one hand and aiming at a name. app.css already guarantees 44px of height below md. -->
    <button
        type="button"
        onclick={() => onToggle(person)}
        aria-pressed={arrived}
        class={cn(
            'flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left',
            pending && 'opacity-60',
        )}>
        <span
            class={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border',
                arrived
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground',
            )}>
            {#if arrived}
                <Check class="size-4" />
            {/if}
        </span>

        <span class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-medium">{person.name}</span>
            <span class="text-muted-foreground text-xs">
                {person.tierLabel}
                <!-- The arrival time, in the reunion's own zone. Never the runtime's: Railway is UTC and
                     a 9:40 tick displayed as 16:40 would read as a wrong record, not a wrong zone. -->
                {#if arrived && person.checkedInAt}
                    · arrived {formatReunionDateTime(person.checkedInAt, 'time')}
                {/if}
            </span>
        </span>
    </button>

    <!-- The shirt, as a chip that STATES THE SIZE and is also the button that records handing it over.
         The size is what the greeter reads off the row while reaching into a box, so it is the label
         rather than a detail under the name.

         A missing size is called out rather than left blank: that person is standing there now and has
         to be asked, and an empty chip would read as "no shirt ordered". The tap still works — somebody
         who takes a shirt has taken it whether or not the form ever said which one. -->
    <button
        type="button"
        onclick={() => onToggleShirt(person)}
        aria-pressed={shirtGiven}
        aria-label="{shirtGiven ? 'Un-record' : 'Record'} shirt for {person.name}"
        class={cn(
            'mr-2 flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors',
            shirtGiven
                ? 'bg-primary text-primary-foreground border-primary'
                : person.shirtSize
                  ? 'border-muted-foreground text-foreground'
                  : 'border-destructive/60 text-destructive',
            shirtPending && 'opacity-60',
        )}>
        {#if shirtGiven}
            <Check class="size-3.5" />
        {:else}
            <Shirt class="size-3.5" />
        {/if}
        {person.shirtSize ?? 'No size'}
    </button>
</div>
