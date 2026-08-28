<script lang="ts">
import { Link2, Link2Off } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { AdminDataView, MemberSelect } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '$lib/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { formatPartialBirthDate } from '$lib/utils/age'

let { data } = $props()

let editing = $state<{
    partyMemberId: string
    name: string
    currentLinkId: string | null
} | null>(null)

let pickerValue = $state('')

function openLinkDialog(attendee: (typeof data.attendees)[number]) {
    editing = {
        partyMemberId: attendee.id,
        name: attendee.name,
        currentLinkId: attendee.familyMemberId,
    }
    pickerValue = attendee.familyMemberId ?? ''
}

function closeDialog() {
    editing = null
    pickerValue = ''
}

/* No client-side year filter any more — the loader returns this event's attendees and nothing else. */
let unlinkedCount = $derived(data.attendees.filter((a) => a.familyMemberId === null).length)

const memberPickerOptions = $derived(
    data.members.map((m) => ({
        id: m.id,
        name: m.birthYear ? `${m.name} (b. ${m.birthYear})` : m.name,
    })),
)
</script>

<svelte:head>
    <title>Attendees — Admin</title>
</svelte:head>

<section class="col-span-12">
    <div class="flex flex-wrap items-center gap-3">
        <h1>Attendees</h1>
        <!-- Counts what is left to do rather than how many rows there are. The old badge showed the
             whole-history total, which was about to become a per-event total meaning something else. -->
        {#if unlinkedCount > 0}
            <Badge variant="secondary">{unlinkedCount} not linked</Badge>
        {:else if data.attendees.length > 0}
            <Badge variant="secondary">All {data.attendees.length} linked</Badge>
        {/if}
    </div>
    <p class="text-muted-foreground mt-1 text-sm">
        Link an attendee to their family-tree node so the genealogy and registration sides can
        cross-reference.
    </p>
</section>

{#if data.attendees.length === 0}
    <section class="col-span-12">
        <p class="text-muted-foreground">Nobody has paid for this year yet.</p>
    </section>
{:else}
    <section class="col-span-12">
        <AdminDataView>
            {#snippet mobileCards()}
                <div class="space-y-3">
                    {#each data.attendees as a (a.id)}
                        {@const born = formatPartialBirthDate(
                            a.birthYear,
                            a.birthMonth,
                            a.birthDay,
                        )}
                        <div class="rounded-lg border bg-card p-4">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="font-medium truncate">{a.name}</p>
                                    <p class="text-xs text-muted-foreground mt-0.5">
                                        {a.tierLabel}{#if born}
                                            · b. {born}
                                        {/if}
                                    </p>
                                    <p class="text-xs text-muted-foreground mt-1">
                                        Reg by {a.contactName}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onclick={() => openLinkDialog(a)}>
                                    {a.familyMemberId ? 'Edit link' : 'Link'}
                                </Button>
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {#if a.addressLine1}
                                    {a.addressLine1}{#if a.addressLine2}, {a.addressLine2}{/if},
                                    {a.addressCity}, {a.addressState}
                                    {a.addressZip}
                                {/if}
                            </p>
                            <p class="text-xs text-muted-foreground mt-1">
                                Vegetarian: {a.vegetarianMeal === null
                                    ? '—'
                                    : a.vegetarianMeal
                                      ? 'Yes'
                                      : 'No'}
                                · Attended 2025: {a.attendedReunion2025 === null
                                    ? '—'
                                    : a.attendedReunion2025
                                      ? 'Yes'
                                      : 'No'}
                            </p>
                            <div class="mt-2 text-xs">
                                {#if a.linkedName}
                                    <span class="inline-flex items-center gap-1 text-primary">
                                        <Link2 class="h-3 w-3" />
                                        {a.linkedName}
                                    </span>
                                {:else}
                                    <span
                                        class="inline-flex items-center gap-1 text-muted-foreground">
                                        <Link2Off class="h-3 w-3" />
                                        Not linked
                                    </span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/snippet}
            {#snippet desktopTable()}
                <Card>
                    <CardContent class="p-0">
                        <div class="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Attendee</TableHead>
                                        <TableHead>Tier</TableHead>
                                        <TableHead>Born</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Vegetarian</TableHead>
                                        <TableHead>Attended 2025</TableHead>
                                        <TableHead>Registered by</TableHead>
                                        <TableHead>Tree node</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {#each data.attendees as a (a.id)}
                                        {@const born = formatPartialBirthDate(
                                            a.birthYear,
                                            a.birthMonth,
                                            a.birthDay,
                                        )}
                                        <TableRow>
                                            <TableCell class="font-medium">{a.name}</TableCell>
                                            <TableCell class="text-muted-foreground"
                                                >{a.tierLabel}</TableCell>
                                            <TableCell class="text-muted-foreground"
                                                >{born ?? '—'}</TableCell>
                                            <TableCell class="text-muted-foreground text-sm">
                                                {#if a.addressLine1}
                                                    {a.addressLine1}{#if a.addressLine2}
                                                        , {a.addressLine2}{/if}, {a.addressCity},
                                                    {a.addressState}
                                                    {a.addressZip}
                                                {:else}
                                                    —
                                                {/if}
                                            </TableCell>
                                            <TableCell class="text-muted-foreground">
                                                {a.vegetarianMeal === null
                                                    ? '—'
                                                    : a.vegetarianMeal
                                                      ? 'Yes'
                                                      : 'No'}
                                            </TableCell>
                                            <TableCell class="text-muted-foreground">
                                                {a.attendedReunion2025 === null
                                                    ? '—'
                                                    : a.attendedReunion2025
                                                      ? 'Yes'
                                                      : 'No'}
                                            </TableCell>
                                            <TableCell class="text-muted-foreground text-sm">
                                                {a.contactName}
                                            </TableCell>
                                            <TableCell>
                                                {#if a.linkedName}
                                                    <span
                                                        class="inline-flex items-center gap-1 text-primary text-sm">
                                                        <Link2 class="h-3.5 w-3.5" />
                                                        {a.linkedName}
                                                    </span>
                                                {:else}
                                                    <span
                                                        class="inline-flex items-center gap-1 text-muted-foreground text-sm">
                                                        <Link2Off class="h-3.5 w-3.5" />
                                                        Not linked
                                                    </span>
                                                {/if}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onclick={() => openLinkDialog(a)}>
                                                    {a.familyMemberId ? 'Edit' : 'Link'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    {/each}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            {/snippet}
        </AdminDataView>
    </section>
{/if}

<Dialog open={editing !== null} onOpenChange={(o) => !o && closeDialog()}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Link {editing?.name ?? ''}</DialogTitle>
        </DialogHeader>
        <form
            method="POST"
            action="?/link"
            use:enhance={() => {
                return ({ result, update }) => {
                    if (result.type === 'success') {
                        closeDialog()
                    }
                    update()
                }
            }}
            class="space-y-4 pt-2">
            <input type="hidden" name="partyMemberId" value={editing?.partyMemberId ?? ''} />
            <div class="space-y-1.5">
                <label for="member-picker" class="text-sm font-medium">Family-tree node</label>
                <MemberSelect
                    members={memberPickerOptions}
                    bind:value={pickerValue}
                    name="familyMemberId"
                    placeholder="Search by name…" />
                <p class="text-xs text-muted-foreground">Leave blank to unlink.</p>
            </div>
            <DialogFooter class="gap-2">
                <Button type="button" variant="ghost" onclick={closeDialog}>Cancel</Button>
                {#if editing?.currentLinkId}
                    <Button
                        type="submit"
                        variant="outline"
                        onclick={() => (pickerValue = '')}
                        formaction="?/link">
                        Unlink
                    </Button>
                {/if}
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
