<script lang="ts">
import { LoaderCircle, Undo2, UserMinus } from '@lucide/svelte'
import { SvelteSet } from 'svelte/reactivity'
import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { NativeSelect } from '$lib/components/ui/native-select'
import { Separator } from '$lib/components/ui/separator'
import type { RegistrationMember } from '$lib/server/registrations'
import { formatPrice } from '$lib/utils'
import { formatBirthDate } from '$lib/utils/age'
import FormErrorSummary from '../../../register/FormErrorSummary.svelte'
import ShirtSizeSelect from '../../../register/ShirtSizeSelect.svelte'
import TierSelect from '../../../register/TierSelect.svelte'
import YesNoSelect from '../../../register/YesNoSelect.svelte'
import type { TierOption } from '../../../register/types'
import { adminEditRegistrationSchema } from './schema'

const SETTABLE_STATUSES = [
    { value: 'pending', label: 'Awaiting payment' },
    { value: 'paid', label: 'Paid' },
    { value: 'waived', label: 'Covered (no payment due)' },
] as const

type MemberRow = {
    memberId: string
    name: string
    tierId: string
    /* The tier this row rendered with, so a save can tell a deliberate change from an untouched
       select. party_members has no tier_id, so tierId is matched by label and may be ''. */
    initialTierId: string
    birthDate: string | undefined
    shirtSize: string
    vegetarianMeal: 'yes' | 'no' | ''
    attendedReunion2025: 'yes' | 'no' | ''
    priceCents: number
}

let {
    form: initialForm,
    members,
    tiers,
    shirtsEnabled,
    isPaid,
    onCancel,
}: {
    form: SuperValidated<Infer<typeof adminEditRegistrationSchema>>
    members: RegistrationMember[]
    tiers: TierOption[]
    shirtsEnabled: boolean
    /* Drives the money guardrail in the UI. The server refuses these too — this only explains why
       before the organiser tries. */
    isPaid: boolean
    onCancel: () => void
} = $props()

/* $form is a superforms STORE, so binding to nested members[i].name is untrackable. The editing
   surface is $state and there is exactly ONE sync into $form, in onSubmit — the architecture the
   register pages settled on after two production bugs came out of DOM mirroring. */
const { form, errors, message, submitting, enhance } = superForm(initialForm, {
    validators: zodClient(adminEditRegistrationSchema),
    dataType: 'json',
    resetForm: false,
    onSubmit: () => {
        $form.members = rows
            .filter((row) => !removed.has(row.memberId))
            .map((row) => ({
                memberId: row.memberId,
                name: row.name,
                /* Omitted unless deliberately changed — see the schema note on tierId. */
                tierId: row.tierId && row.tierId !== row.initialTierId ? row.tierId : undefined,
                birthDate: row.birthDate ?? '',
                shirtSize: row.shirtSize,
                vegetarianMeal: row.vegetarianMeal,
                attendedReunion2025: row.attendedReunion2025,
            }))
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
    }
}

let rows = $state<MemberRow[]>(members.map(toRow))
let removed = new SvelteSet<string>()

let remainingCount = $derived(rows.filter((row) => !removed.has(row.memberId)).length)

function handleRemove(memberId: string) {
    removed.add(memberId)
}

function handleRestore(memberId: string) {
    removed.delete(memberId)
}
</script>

<form method="POST" action="?/save" use:enhance class="flex flex-col gap-6">
    <FormErrorSummary errors={$errors} message={$message} />

    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                    <label for="editContactName" class="text-sm font-medium">Name</label>
                    <Input id="editContactName" type="text" bind:value={$form.contactName} />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="editContactEmail" class="text-sm font-medium">Email</label>
                    <Input id="editContactEmail" type="email" bind:value={$form.contactEmail} />
                    <p class="text-muted-foreground text-xs">
                        Correcting a bounced address sends the notification to the new one.
                    </p>
                </div>
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                    <label for="editContactPhone" class="text-sm font-medium">Phone</label>
                    <Input id="editContactPhone" type="tel" bind:value={$form.contactPhone} />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="editStatus" class="text-sm font-medium">Payment status</label>
                    <NativeSelect id="editStatus" bind:value={$form.status}>
                        {#each SETTABLE_STATUSES as status (status.value)}
                            <option value={status.value}>{status.label}</option>
                        {/each}
                    </NativeSelect>
                </div>
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader class="pb-3">
            <CardTitle class="text-base">Party</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            {#each rows as row, index (row.memberId)}
                {@const isRemoved = removed.has(row.memberId)}
                <div class="rounded-lg border p-4" class:opacity-50={isRemoved}>
                    <div class="mb-3 flex items-center justify-between gap-2">
                        <span class="text-muted-foreground text-xs font-semibold uppercase">
                            Person {index + 1}
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

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="flex flex-col gap-1.5">
                            <label for="name-{row.memberId}" class="text-sm font-medium"
                                >Name</label>
                            <Input
                                id="name-{row.memberId}"
                                type="text"
                                bind:value={row.name}
                                disabled={isRemoved} />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label for="tier-{row.memberId}" class="text-sm font-medium"
                                >Tier</label>
                            {#if isPaid}
                                <Input
                                    id="tier-{row.memberId}"
                                    type="text"
                                    value="{tiers.find((t) => t.id === row.tierId)?.label ??
                                        'Unknown'} — ${formatPrice(row.priceCents)}"
                                    disabled />
                                <p class="text-muted-foreground text-xs">
                                    Locked: this party has paid, so changing a tier owes a refund.
                                </p>
                            {:else}
                                <TierSelect
                                    id="tier-{row.memberId}"
                                    bind:tierId={row.tierId}
                                    {tiers} />
                            {/if}
                        </div>
                    </div>

                    <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="flex flex-col gap-1.5">
                            <label for="dob-{row.memberId}" class="text-sm font-medium">
                                Birthday
                            </label>
                            <DatePicker
                                id="dob-{row.memberId}"
                                bind:value={row.birthDate}
                                placeholder="Not recorded" />
                        </div>
                        {#if shirtsEnabled}
                            <div class="flex flex-col gap-1.5">
                                <label for="shirt-{row.memberId}" class="text-sm font-medium">
                                    T-shirt
                                </label>
                                <ShirtSizeSelect
                                    id="shirt-{row.memberId}"
                                    bind:value={row.shirtSize}
                                    emptyLabel="Not recorded" />
                            </div>
                        {/if}
                    </div>

                    <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="flex flex-col gap-1.5">
                            <label for="veg-{row.memberId}" class="text-sm font-medium">
                                Vegetarian meal?
                            </label>
                            <YesNoSelect
                                id="veg-{row.memberId}"
                                bind:value={row.vegetarianMeal}
                                allowClear
                                clearLabel="Not answered" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label for="attended-{row.memberId}" class="text-sm font-medium">
                                Attended 2025?
                            </label>
                            <YesNoSelect
                                id="attended-{row.memberId}"
                                bind:value={row.attendedReunion2025}
                                allowClear
                                clearLabel="Not answered" />
                        </div>
                    </div>
                </div>
            {/each}

            {#if remainingCount <= 1}
                <p class="text-muted-foreground text-xs">
                    A registration must keep at least one person. Cancel it instead of emptying it.
                </p>
            {/if}
        </CardContent>
    </Card>

    <Separator />

    <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={$submitting}>
            {#if $submitting}
                <LoaderCircle class="size-4 animate-spin" /> Saving…
            {:else}
                Save changes
            {/if}
        </Button>
        <Button type="button" variant="ghost" onclick={onCancel} disabled={$submitting}>
            Cancel
        </Button>
        <p class="text-muted-foreground text-xs">
            Saving emails the registrant what changed, with a link that works. Their existing link
            keeps working for a week.
        </p>
    </div>
</form>
