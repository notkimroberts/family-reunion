<script lang="ts">
import { History } from '@lucide/svelte'
import { SvelteMap } from 'svelte/reactivity'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { formatViewerDateTime } from '$lib/utils'

/* Phrased as what happened, not as the enum value. */
const actionCopyValue = {
    status_changed: 'Payment status changed',
    member_added: 'Member added',
    member_updated: 'Member details updated',
    member_removed: 'Member removed',
    contact_updated: 'Contact details updated',
    link_reissued: 'Management link re-issued',
} as const

type Entry = {
    id: string
    action: string
    detail: unknown
    createdAt: Date | string
    actorName: string | null
    joinedActorName: string | null
}

let { history }: { history: Entry[] } = $props()

/* Formatted after mount, keyed by row id.

   $effect never runs during SSR, which is the point: with no timeZone option Intl resolves to the
   environment's zone, and Node on Railway is UTC. Formatting inline would put UTC in the server HTML,
   and Svelte does not recompute template text on hydration — the wrong time would just sit there. This
   way the server emits the ISO value and the browser replaces it with the reader's own clock.

   NOT a $derived, though it looks like one: $derived is evaluated during SSR too, so it would bake the
   server's zone into the markup and reintroduce the bug. The effect is doing timing work, not deriving
   a value. */
let formattedTimes = new SvelteMap<string, string>()

$effect(() => {
    for (const entry of history) {
        formattedTimes.set(entry.id, formatViewerDateTime(entry.createdAt))
    }
})

/* What the server renders, and what a reader gets if the effect has not run yet. Machine-readable and
   never wrong, unlike a guess at their timezone. */
function isoValue(value: Date | string): string {
    return new Date(value).toISOString()
}

function actionLabel(action: string): string {
    return actionCopyValue[action as keyof typeof actionCopyValue] ?? action
}

/* Renders the parts of detail worth reading — a status transition and a person's name. Anything else
   stays out rather than dumping raw JSON at an organiser. */
function detailLabel(detail: unknown): string {
    if (typeof detail !== 'object' || detail === null) {
        return ''
    }
    const record = detail as Record<string, unknown>
    if (typeof record.from === 'string' && typeof record.to === 'string') {
        return `${record.from} → ${record.to}`
    }
    if (typeof record.name === 'string') {
        return record.name
    }
    if (typeof record.email === 'string') {
        return String(record.email)
    }
    return ''
}
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
            <History class="text-muted-foreground size-4" />
            History
        </CardTitle>
    </CardHeader>
    <CardContent>
        {#if history.length === 0}
            <p class="text-muted-foreground text-sm">
                No admin changes recorded. Anything an organiser changes from here on is listed.
            </p>
        {:else}
            <ul class="flex flex-col gap-3">
                {#each history as entry (entry.id)}
                    {@const detail = detailLabel(entry.detail)}
                    <li class="flex flex-col gap-0.5 border-l-2 pl-3 text-sm">
                        <span class="font-medium">
                            {actionLabel(entry.action)}{#if detail}
                                <span class="text-muted-foreground font-normal"> · {detail}</span>
                            {/if}
                        </span>
                        <span class="text-muted-foreground text-xs">
                            <time datetime={isoValue(entry.createdAt)}>
                                {formattedTimes.get(entry.id) ?? isoValue(entry.createdAt)}
                            </time>
                            · {entry.actorName ?? entry.joinedActorName ?? 'a removed account'}
                        </span>
                    </li>
                {/each}
            </ul>
        {/if}
    </CardContent>
</Card>
