<script lang="ts">
import { History } from '@lucide/svelte'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'

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

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
})

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
            <History class="size-4 text-muted-foreground" />
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
                            {dateFormatter.format(new Date(entry.createdAt))} ·
                            {entry.actorName ?? entry.joinedActorName ?? 'a removed account'}
                        </span>
                    </li>
                {/each}
            </ul>
        {/if}
    </CardContent>
</Card>
