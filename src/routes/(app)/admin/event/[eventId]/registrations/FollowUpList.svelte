<script lang="ts">
import { ChevronRight, Mail, Phone } from '@lucide/svelte'
import { AdminDataView } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import * as Table from '$lib/components/ui/table'
import { WARNING_SURFACE_CLASS } from '$lib/general/constants'
import type { RegistrationNote } from '$lib/server/registrations'
import { FOLLOW_UP_REASON_LABELS } from './FOLLOW_UP_REASON_LABELS'
import type { FollowUp } from './followUps'

/* The families to ring, each with why. Phone and email are links so a tap on a phone starts the
   call; the row links to the booking for anything the call changes. */
interface Props {
    followUps: FollowUp[]
    /* Newest note per booking id, so the caller can see what was said last time. */
    latestNotes: Record<string, RegistrationNote>
    eventId: string
}

let { followUps, latestNotes, eventId }: Props = $props()
</script>

{#snippet reasons(followUp: FollowUp)}
    <div class="flex flex-wrap gap-1">
        {#each followUp.reasons as reason (reason)}
            <Badge variant="outline" class={WARNING_SURFACE_CLASS}>
                {FOLLOW_UP_REASON_LABELS[reason]}
            </Badge>
        {/each}
    </div>
    {#if followUp.missingShirtNames.length > 0}
        <p class="text-muted-foreground text-xs">
            Shirt size for {followUp.missingShirtNames.join(', ')}
        </p>
    {/if}
    {#if latestNotes[followUp.registration.id]}
        {@const note = latestNotes[followUp.registration.id]}
        <p class="text-muted-foreground line-clamp-2 text-xs italic">
            Last note: {note.body}{note.authorName ? ` — ${note.authorName}` : ''}
        </p>
    {/if}
{/snippet}

{#snippet contact(followUp: FollowUp)}
    <div class="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
        {#if followUp.registration.contactPhone}
            <a
                href="tel:{followUp.registration.contactPhone}"
                class="relative z-10 flex items-center gap-1 underline-offset-2 hover:underline">
                <Phone class="size-3" />
                {followUp.registration.contactPhone}
            </a>
        {/if}
        <a
            href="mailto:{followUp.registration.contactEmail}"
            class="relative z-10 flex items-center gap-1 underline-offset-2 hover:underline">
            <Mail class="size-3" />
            {followUp.registration.contactEmail}
        </a>
    </div>
{/snippet}

{#if followUps.length === 0}
    <p class="text-muted-foreground py-8 text-center text-sm">Nobody to follow up with.</p>
{:else}
    <AdminDataView>
        {#snippet mobileCards()}
            <div class="flex flex-col gap-2">
                {#each followUps as followUp (followUp.registration.id)}
                    <div class="bg-card relative flex flex-col gap-1.5 rounded-lg border p-3">
                        <a
                            href="/admin/event/{eventId}/registrations/{followUp.registration.id}"
                            class="flex items-center justify-between font-medium after:absolute after:inset-0">
                            {followUp.registration.contactName}
                            <ChevronRight class="text-muted-foreground size-4" />
                        </a>
                        {@render contact(followUp)}
                        {@render reasons(followUp)}
                    </div>
                {/each}
            </div>
        {/snippet}

        {#snippet desktopTable()}
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>Contact</Table.Head>
                        <Table.Head>Why</Table.Head>
                        <Table.Head></Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each followUps as followUp (followUp.registration.id)}
                        <Table.Row>
                            <Table.Cell>
                                <p class="font-medium">{followUp.registration.contactName}</p>
                                {@render contact(followUp)}
                            </Table.Cell>
                            <Table.Cell>
                                <div class="flex flex-col gap-1">
                                    {@render reasons(followUp)}
                                </div>
                            </Table.Cell>
                            <Table.Cell class="text-right">
                                <a
                                    href="/admin/event/{eventId}/registrations/{followUp
                                        .registration.id}"
                                    aria-label="Open {followUp.registration.contactName}'s booking"
                                    class="text-muted-foreground hover:text-foreground inline-flex">
                                    <ChevronRight class="size-4" />
                                </a>
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        {/snippet}
    </AdminDataView>
{/if}
