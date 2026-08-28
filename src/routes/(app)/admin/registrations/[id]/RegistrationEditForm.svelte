<script lang="ts">
import { LoaderCircle, Undo2, UserMinus } from '@lucide/svelte'
import { SvelteSet } from 'svelte/reactivity'
import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { NativeSelect } from '$lib/components/ui/native-select'
import { Separator } from '$lib/components/ui/separator'
import type { RegistrationMember } from '$lib/server/registrations'
import { formatBirthDate } from '$lib/utils/age'
import FormErrorSummary from '../../../register/FormErrorSummary.svelte'
import PartyMembersBuilder from '../../../register/PartyMembersBuilder.svelte'
import type { FormMember, TierOption } from '../../../register/types'
import PartyMemberFields from './PartyMemberFields.svelte'
import { hasRegistrationEdits } from './hasRegistrationEdits'
import type { MemberRow } from './memberRow'
import { adminEditRegistrationSchema } from './schema'

/* The database's own words. "Covered (no payment due)" and "Awaiting payment" were labels invented
   here, and the badge beside the heading says Paid / Pending / Waived — one vocabulary. */
const SETTABLE_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'waived', label: 'Waived' },
] as const

let {
    form: initialForm,
    members,
    tiers,
    isPaid,
    onCancel,
    onSaved,
}: {
    form: SuperValidated<Infer<typeof adminEditRegistrationSchema>>
    members: RegistrationMember[]
    tiers: TierOption[]
    /* Drives the money guardrail in the UI. The server refuses these too — this only explains why
       before the organiser tries. */
    isPaid: boolean
    onCancel: () => void
    onSaved: () => void
} = $props()

/* $form is a superforms STORE, so binding to nested members[i].name is untrackable. The editing
   surface is $state and there is exactly ONE sync into $form, in onSubmit — the architecture the
   register pages settled on after two production bugs came out of DOM mirroring. */
const { form, errors, message, submitting, enhance } = superForm(initialForm, {
    validators: zodClient(adminEditRegistrationSchema),
    dataType: 'json',
    resetForm: false,
    /* Leave edit mode only on a genuine success. A guard refusing (repricing a paid party, emptying
       it) comes back as fail(409) and a validation error as fail(400) — both must keep the form open
       with the staged changes intact, or the organiser is told it did not save while losing the work
       they would need to retry. */
    onResult: ({ result }) => {
        if (result.type === 'success') {
            onSaved()
        }
    },
    onSubmit: () => {
        $form.members = rows
            .filter((row) => !removed.has(row.memberId))
            .map((row) => ({
                memberId: row.memberId,
                /* The contact's name comes from the Contact field. There is one of it on screen and
                   one writer behind it — see party_members.isContact. */
                name: row.isContact ? $form.contactName : row.name,
                /* Omitted unless deliberately changed — see the schema note on tierId. */
                tierId: row.tierId && row.tierId !== row.initialTierId ? row.tierId : undefined,
                birthDate: row.birthDate ?? '',
                shirtSize: row.shirtSize,
                vegetarianMeal: row.vegetarianMeal,
                attendedReunion2025: row.attendedReunion2025,
            }))
        $form.newMembers = newMembers.map((member) => ({ ...member }))
        $form.removedMemberIds = [...removed]
    },
})

function tierIdForLabel(label: string): string {
    return tiers.find((tier) => tier.label === label)?.id ?? ''
}

function toRow(member: RegistrationMember): MemberRow {
    const tierId = tierIdForLabel(member.tierLabel)
    return {
        memberId: member.id,
        name: member.name,
        tierId,
        initialTierId: tierId,
        birthDate:
            formatBirthDate(member.birthYear, member.birthMonth, member.birthDay) || undefined,
        shirtSize: member.shirtSize ?? '',
        vegetarianMeal: member.vegetarianMeal === null ? '' : member.vegetarianMeal ? 'yes' : 'no',
        attendedReunion2025:
            member.attendedReunion2025 === null ? '' : member.attendedReunion2025 ? 'yes' : 'no',
        priceCents: member.priceCents,
        isContact: member.isContact,
    }
}

let rows = $state<MemberRow[]>(members.map(toRow))
let removed = new SvelteSet<string>()

/* What the form held on open, for the dirty check behind Save. Rebuilt from the props rather than
   captured from `rows`, so it cannot be reached by the bindings that edit them. */
const initialRows = members.map(toRow)

/* The contact attends their own reunion, so one of these rows IS the person named and emailed in the
   Contact card. Their fields render inside that card rather than as another person below it — showing
   both put two Name fields on screen for one human.

   Undefined is possible and handled: a registration written before the contact was linked has no
   flagged row, and those fall through to the party list with their name editable, as before. */
let contactIndex = $derived(rows.findIndex((row) => row.isContact))
let otherIndexes = $derived(
    rows.map((row, index) => ({ row, index })).filter(({ row }) => !row.isContact),
)

/* Staged, not written. They land on Save with everything else, so the registrant gets one email for
   the whole sitting rather than one per person added. */
let newMembers = $state<FormMember[]>([])

/* PartyMembersBuilder offers "same address as the contact" for a new person. That address is not on
   the registration — it lives on the contact's own attendee row. */
let contactMember = $derived(members.find((member) => member.isContact))
let contactAddress = $derived({
    addressLine1: contactMember?.addressLine1 ?? '',
    addressLine2: contactMember?.addressLine2 ?? '',
    addressCity: contactMember?.addressCity ?? '',
    addressState: contactMember?.addressState ?? '',
    addressZip: contactMember?.addressZip ?? '',
})

let remainingCount = $derived(rows.filter((row) => !removed.has(row.memberId)).length)

/* Save is offered only when there is something to save — see hasRegistrationEdits for why each of the
   four pieces of state is compared the way it is. */
let hasChanges = $derived(
    hasRegistrationEdits({
        form: $form,
        initialForm: initialForm.data,
        rows,
        initialRows,
        removedCount: removed.size,
        newMemberCount: newMembers.length,
    }),
)

function handleRemove(memberId: string) {
    removed.add(memberId)
}

function handleRestore(memberId: string) {
    removed.delete(memberId)
}
</script>

<form method="POST" action="?/save" use:enhance class="flex flex-col gap-6">
    <FormErrorSummary errors={$errors} message={$message} />

    <!-- Money, not who to contact, so it gets its own section. -->
    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Payment status</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
            <NativeSelect id="editStatus" bind:value={$form.status}>
                {#each SETTABLE_STATUSES as status (status.value)}
                    <option value={status.value}>{status.label}</option>
                {/each}
            </NativeSelect>
            <p class="text-muted-foreground text-xs">
                Changing this emails the registrant to tell them where their payment stands.
            </p>
        </CardContent>
    </Card>

    <!-- The contact and their own attendance in one card. They are one person, so: one Name field, and
         an email and phone that plainly belong to them rather than floating above a separate card
         labelled CONTACT. -->
    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                    <label for="editContactName" class="text-sm font-medium">
                        Name <span class="text-destructive">*</span>
                    </label>
                    <Input id="editContactName" type="text" bind:value={$form.contactName} />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="editContactEmail" class="text-sm font-medium">
                        Email <span class="text-destructive">*</span>
                    </label>
                    <Input id="editContactEmail" type="email" bind:value={$form.contactEmail} />
                    <p class="text-muted-foreground text-xs">
                        Correcting a bounced address sends the notification to the new one.
                    </p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="editContactPhone" class="text-sm font-medium">Phone</label>
                    <Input id="editContactPhone" type="tel" bind:value={$form.contactPhone} />
                </div>
            </div>

            {#if contactIndex >= 0}
                <Separator />
                <p class="text-muted-foreground text-xs">
                    They are attending as well — these are their own registration details.
                </p>
                <PartyMemberFields
                    bind:row={rows[contactIndex]}
                    {tiers}
                    {isPaid}
                    showName={false} />
            {/if}
        </CardContent>
    </Card>

    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">
                {contactIndex >= 0 ? 'Others in the party' : 'Party'}
            </CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            {#each otherIndexes as { row, index }, position (row.memberId)}
                {@const isRemoved = removed.has(row.memberId)}
                <div class="rounded-lg border p-4" class:opacity-50={isRemoved}>
                    <div class="mb-3 flex items-center justify-between gap-2">
                        <span class="text-muted-foreground text-xs font-semibold uppercase">
                            Person {position + 1}
                        </span>
                        {#if isRemoved}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={() => handleRestore(row.memberId)}>
                                <Undo2 class="size-3.5" /> Keep
                            </Button>
                        {:else}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                class="text-muted-foreground hover:text-destructive"
                                disabled={isPaid || remainingCount <= 1}
                                onclick={() => handleRemove(row.memberId)}>
                                <UserMinus class="size-3.5" /> Remove
                            </Button>
                        {/if}
                    </div>

                    <PartyMemberFields
                        bind:row={rows[index]}
                        {tiers}
                        {isPaid}
                        disabled={isRemoved} />
                </div>
            {/each}

            {#if otherIndexes.length === 0}
                <p class="text-muted-foreground text-sm">Nobody else in this party yet.</p>
            {/if}

            {#if remainingCount <= 1}
                <p class="text-muted-foreground text-xs">
                    A registration must keep at least one person. Cancel it instead of emptying it.
                </p>
            {/if}

            <Separator />

            <!-- Staged additions. Reuses the public form's builder, so an admin addition collects and
                 validates exactly what a registrant's does. -->
            <PartyMembersBuilder
                bind:members={newMembers}
                {tiers}
                contactName={$form.contactName}
                {contactAddress} />

            <p class="text-muted-foreground text-xs">
                Anyone added here joins the party when you save, at the tier's face value. No
                payment is taken.
            </p>
        </CardContent>
    </Card>

    <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={$submitting || !hasChanges}>
            {#if $submitting}
                <LoaderCircle class="size-4 animate-spin" /> Saving…
            {:else}
                Save changes
            {/if}
        </Button>
        <Button type="button" variant="ghost" onclick={onCancel} disabled={$submitting}>
            Cancel
        </Button>
        <!-- Says why the button is grey. A disabled control with no explanation reads as a broken
             page rather than as nothing to do. -->
        <p class="text-muted-foreground text-xs">
            {#if hasChanges}
                Saving emails the registrant what changed, with a link that works. Their existing
                link keeps working for a week.
            {:else}
                Nothing has changed yet, so there is nothing to save.
            {/if}
        </p>
    </div>
</form>
