<script lang="ts">
import { Check, Copy, TriangleAlert } from '@lucide/svelte'
import { getContext } from 'svelte'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import type { AdminContext } from '$lib/types/adminContext'
import { getTierPriceCents } from '$lib/utils'
import { EMPTY_PERSON_DETAILS } from '../../register/EMPTY_PERSON_DETAILS'
import OrderSummaryCard from '../../register/OrderSummaryCard.svelte'
import PartyMembersBuilder from '../../register/PartyMembersBuilder.svelte'
import YourInformationCard from '../../register/YourInformationCard.svelte'
import { isContactComplete } from '../../register/isContactComplete'
import { adminRegistrationSchema } from '../../register/schema'
import type { FormMember, PersonDetails } from '../../register/types'

let { data, form: actionData } = $props()

const adminCtx = getContext<AdminContext>('admin')

/* superforms' $form is a STORE, not $state, so $form.self is a plain object and binding to its
   nested properties is untrackable ("binding_property_non_reactive"). See the fuller note on the
   public register page: $state is the editing surface, and exactly ONE sync into $form happens in
   onSubmit — which superforms runs before client validation, so validators still see fresh data,
   and dataType 'json' means nothing is mirrored into the DOM. */
const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(adminRegistrationSchema),
    dataType: 'json',
    onSubmit: () => {
        $form.eventId = targetEventId
        $form.self = { ...self }
        $form.members = members.map((member) => ({ ...member }))
    },
    /* handleReset clears state explicitly, so superforms must not also reset $form out from under
       the success banner, which reads the returned manage URL. */
    resetForm: false,
})

let targetEventId = $derived(
    adminCtx.selectedEventId !== 'all' ? adminCtx.selectedEventId : (data.events[0]?.id ?? ''),
)

const tiers = $derived(data.tiers)
const shirtsEnabled = $derived(data.events[0]?.shirtsEnabled ?? false)

let self = $state<PersonDetails>({ ...EMPTY_PERSON_DETAILS })
let members = $state<FormMember[]>([])
let copied = $state(false)
/* Mirrors YourInformationCard's internal Save state, so the contact must be committed before the
   registration can be submitted. UI state, so it stays out of $form. */
let contactSaved = $state(false)

let contactName = $derived(
    `${$form.contactFirstName.trim()} ${$form.contactLastName.trim()}`.trim(),
)
let contactAddress = $derived({
    addressLine1: self.addressLine1,
    addressLine2: self.addressLine2,
    addressCity: self.addressCity,
    addressState: self.addressState,
    addressZip: self.addressZip,
})

let subtotal = $derived(
    (self.tierId ? getTierPriceCents(self.tierId, tiers) : 0) +
        members.reduce((sum, member) => sum + getTierPriceCents(member.tierId, tiers), 0),
)

/* Mirrors the public form's gate, so an admin cannot submit a paper entry the schema would reject
   server-side. */
let canSubmit = $derived(
    contactSaved &&
        isContactComplete({
            firstName: $form.contactFirstName,
            lastName: $form.contactLastName,
            email: $form.contactEmail,
            details: self,
        }),
)

function handleReset() {
    $form.contactFirstName = ''
    $form.contactLastName = ''
    $form.contactEmail = ''
    $form.contactPhone = ''
    $form.status = 'paid'
    self = { ...EMPTY_PERSON_DETAILS }
    members = []
    contactSaved = false
    copied = false
}

async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    copied = true
}
</script>

<svelte:head>
    <title>Add Registration — Admin</title>
</svelte:head>

<section class="col-span-12">
    <div class="mb-6 flex flex-col gap-1">
        <a href="/admin" class="text-sm text-muted-foreground hover:text-foreground">← Admin</a>
        <h1>Add Paper Registration</h1>
        <p class="text-muted-foreground text-sm">
            Manually register someone who submitted on paper. The same details are required as the
            public form, so catering and shirt counts stay complete.
        </p>
    </div>

    {#if data.events.length === 0}
        <Card>
            <CardContent class="pt-6">
                <p class="text-muted-foreground">No open events. Open an event first.</p>
                <Button href="/admin/events" variant="outline" class="mt-4">Manage Events</Button>
            </CardContent>
        </Card>
    {:else}
        {#if actionData?.success}
            <div
                class="mb-4 flex flex-col gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
                <p class="font-medium">Registration added.</p>

                {#if actionData.emailSent}
                    <p>A confirmation email was sent with their management link.</p>
                {:else}
                    <p class="flex items-start gap-2">
                        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            The registration was saved, but the confirmation email did not send{actionData.emailError
                                ? ` (${actionData.emailError})`
                                : ''}. Pass the link below on directly.
                        </span>
                    </p>
                {/if}

                <!-- Shown even on success: the plaintext token exists only in this response. -->
                <div class="flex flex-col gap-2">
                    <span class="text-xs font-semibold uppercase tracking-wide"
                        >Management link</span>
                    <div class="flex flex-wrap items-center gap-2">
                        <code
                            class="min-w-0 flex-1 break-all rounded bg-background/60 px-2 py-1.5 text-xs">
                            {actionData.manageUrl}
                        </code>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onclick={() => handleCopy(actionData.manageUrl)}>
                            {#if copied}
                                <Check class="h-4 w-4" /> Copied
                            {:else}
                                <Copy class="h-4 w-4" /> Copy
                            {/if}
                        </Button>
                    </div>
                </div>

                <div>
                    <Button type="button" variant="outline" size="sm" onclick={handleReset}>
                        Add another
                    </Button>
                </div>
            </div>
        {/if}

        <form method="POST" use:enhance>
            <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
                <!-- Left: party builder -->
                <div class="flex flex-col gap-4">
                    <YourInformationCard
                        bind:email={$form.contactEmail}
                        bind:phone={$form.contactPhone}
                        bind:firstName={$form.contactFirstName}
                        bind:lastName={$form.contactLastName}
                        bind:info={self}
                        bind:saved={contactSaved}
                        {tiers}
                        {shirtsEnabled}
                        errors={{
                            email: $errors.contactEmail?.[0],
                            name: $errors.contactFirstName?.[0] ?? $errors.contactLastName?.[0],
                        }} />

                    <PartyMembersBuilder
                        bind:members
                        {tiers}
                        {contactName}
                        {contactAddress}
                        {shirtsEnabled}
                        error={$errors.members?._errors?.[0]} />
                </div>

                <!-- Right: order summary (sticky on desktop) -->
                <div class="self-start lg:sticky lg:top-6">
                    <OrderSummaryCard
                        {contactName}
                        selfTierId={self.tierId}
                        {members}
                        {tiers}
                        {subtotal}
                        {canSubmit}
                        submitLabel="Add Registration"
                        placeholderText="Fill in the contact's details above and press Save to continue."
                        contactSuffix="contact"
                        showStatus
                        bind:status={$form.status} />
                    {#if $errors.status?.[0]}
                        <p class="mt-2 text-sm text-destructive">{$errors.status[0]}</p>
                    {/if}
                </div>
            </div>
        </form>
    {/if}
</section>
