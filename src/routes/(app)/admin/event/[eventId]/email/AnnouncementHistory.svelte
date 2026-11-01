<script lang="ts">
import { enhance } from '$app/forms'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { WARNING_SURFACE_CLASS } from '$lib/general/constants'
import type { Announcement } from '$lib/server/announcements'
import { formatReunionDateTime } from '$lib/utils'

const STATUS_LABELS = { sending: 'Sending', sent: 'Sent', failed: 'Stopped partway' }

/* Every email sent from this page for this reunion. A failed one offers Retry, which resumes from
   the last batch Resend accepted, to the same list. */
interface Props {
    announcements: (Omit<Announcement, 'recipients'> & { recipientCount: number })[]
    archived: boolean
}

let { announcements, archived }: Props = $props()
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="text-base">Sent before</CardTitle>
    </CardHeader>
    <CardContent>
        {#if announcements.length === 0}
            <p class="text-muted-foreground text-sm">Nothing sent from here yet.</p>
        {:else}
            <ul class="flex flex-col gap-3">
                {#each announcements as announcement (announcement.id)}
                    <li class="flex flex-col gap-1 border-l-2 pl-3 text-sm">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="font-medium">{announcement.subject}</span>
                            <Badge
                                variant="outline"
                                class={announcement.status === 'failed'
                                    ? WARNING_SURFACE_CLASS
                                    : undefined}>
                                {STATUS_LABELS[announcement.status]}
                            </Badge>
                        </div>
                        <span class="text-muted-foreground text-xs">
                            {formatReunionDateTime(announcement.createdAt, 'short')} ·
                            {announcement.sentByName ?? 'a removed account'} ·
                            {announcement.sentCount} of {announcement.recipientCount} families
                        </span>
                        {#if announcement.status === 'failed' && !archived}
                            <form method="POST" action="?/retry" use:enhance>
                                <input
                                    type="hidden"
                                    name="announcementId"
                                    value={announcement.id} />
                                <Button type="submit" size="sm" variant="outline">
                                    Send to the rest
                                </Button>
                            </form>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </CardContent>
</Card>
