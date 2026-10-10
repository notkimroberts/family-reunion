<script lang="ts">
import { toast } from 'svelte-sonner'
import { invalidateAll } from '$app/navigation'
import { Button } from '$lib/components/ui/button'
import type { CheckinGroup } from '../checkin/groupPeopleByBooking'
import { setCheckedIn } from '../checkin/setCheckedIn.remote'

/* A booking's arrivals: "1 of 3" and, until all are here, Check in all.

   Only members not yet arrived are written, as on the check-in page, so it cannot undo an arrival
   recorded at the door. Un-checking stays per person, on the People lens. `group` is undefined for a
   booking with no places — pending or refunded — which has nobody to check in. */
let { group, eventId }: { group: CheckinGroup | undefined; eventId: string } = $props()

let isPending = $state(false)

async function handleCheckInAll() {
    if (!group) {
        return
    }
    isPending = true
    const results = await Promise.allSettled(
        group.members
            .filter((member) => member.checkedInAt === null)
            .map((member) => setCheckedIn({ memberId: member.id, eventId, checkedIn: true })),
    )
    if (results.some((result) => result.status === 'rejected')) {
        toast.error(`Could not check in everyone in ${group.contactName}'s party. Try again.`)
    }
    await invalidateAll()
    isPending = false
}
</script>

{#if group}
    <div class="flex items-center justify-end gap-2">
        <span class="text-sm tabular-nums">{group.arrivedCount}/{group.members.length}</span>
        {#if group.arrivedCount < group.members.length}
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onclick={handleCheckInAll}>
                Check in all
            </Button>
        {/if}
    </div>
{:else}
    <span class="text-muted-foreground text-sm">—</span>
{/if}
