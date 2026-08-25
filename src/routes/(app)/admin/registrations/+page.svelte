<script lang="ts">
import { Check, Copy, TriangleAlert } from '@lucide/svelte'
import { getContext } from 'svelte'
import { superForm } from 'sveltekit-superforms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import type { AdminContext } from '$lib/types/adminContext'
import { getTierPriceCents } from '$lib/utils'
import { EMPTY_PERSON_DETAILS } from '../../register/EMPTY_PERSON_DETAILS'
import OrderSummaryCard from '../../register/OrderSummaryCard.svelte'
import PartyMembersBuilder from '../../register/PartyMembersBuilder.svelte'
import RegistrationHiddenFields from '../../register/RegistrationHiddenFields.svelte'
import YourInformationCard from '../../register/YourInformationCard.svelte'
import { isContactComplete } from '../../register/isContactComplete'
import type { FormMember, PersonDetails } from '../../register/types'

let { data, form: actionData } = $props()

const adminCtx = getContext<AdminContext>('admin')

/* No `validators` here, deliberately — see the same note on the public register page.
   Superforms validates the $form store rather than the DOM and cancels the submit on
   failure; this form's fields live in unbound hidden inputs, so client validation could
   never pass and "Add Registration" did nothing at all. The action still validates
   server-side with adminRegistrationSchema. */
const { form, errors, enhance } = superForm(data.form, {
    dataType: 'form',
    /* Keep the page's own $state (party builder, self details) in charge of resetting —
       superforms resetting the form would not clear those. */
    resetForm: false,
})

let targetEventId = $derived(
    adminCtx.selectedEventId !== 'all' ? adminCtx.selectedEventId : (data.events[0]?.id ?? ''),
)

const tiers = $derived(data.tiers)
const shirtsEnabled = $derived(data.events[0]?.shirtsEnabled ?? false)

let selfFirstName = $state('')
let selfLastName = $state('')
let self = $state<PersonDetails>({ ...EMPTY_PERSON_DETAILS })
let status = $state<'paid' | 'pending' | 'waived'>('paid')
let members = $state<FormMember[]>([])
let copied = $state(false)
/* Mirrors YourInformationCard's internal Save state, so the contact must be committed before
   the registration can be submitted. */
let contactSaved = $state(false)

let contactName = $derived(`${selfFirstName.trim()} ${selfLastName.trim()}`.trim())
let contactAddress = $derived({
    addressLine1: self.addressLine1,
    addressLine2: self.addressLine2,
    addressCity: self.addressCity,
    addressState: self.addressState,
    addressZip: self.addressZip,
})

let membersJson = $derived(JSON.stringify(members))

let subtotal = $derived(
    (self.tierId ? getTierPriceCents(self.tierId, tiers) : 0) +
        members.reduce((sum, member) => sum + getTierPriceCents(member.tierId, tiers), 0),
)

/* Mirrors the public form's gate, so an admin cannot submit a paper entry that the schema
   would reject server-side.

   `?? ''` is deliberate: a rejected submit rebinds $form from the server's parse result, which
   omits any field the POST was missing. Reading .trim() straight off that crashed the page. */
let canSubmit = $derived(
    contactSaved &&
        isContactComplete({
            firstName: selfFirstName,
            lastName: selfLastName,
            email: $form.contactEmail ?? '',
            details: self,
        }),
)

function handleReset() {
    selfFirstName = ''
    selfLastName = ''
    $form.contactEmail = ''
    $form.contactPhone = ''
    self = { ...EMPTY_PERSON_DETAILS }
    status = 'paid'
    members = []
    copied = false
    contactSaved = false
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
            <RegistrationHiddenFields
                eventId={targetEventId}
                {contactName}
                details={self}
                {membersJson} />

            <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
                <!-- Left: party builder -->
                <div class="flex flex-col gap-4">
                    <YourInformationCard
                        bind:email={$form.contactEmail}
                        bind:phone={$form.contactPhone}
                        bind:firstName={selfFirstName}
                        bind:lastName={selfLastName}
                        bind:info={self}
                        bind:saved={contactSaved}
                        {tiers}
                        {shirtsEnabled}
                        errors={{
                            email: $errors.contactEmail?.[0],
                            name: $errors.contactName?.[0],
                        }} />

                    <PartyMembersBuilder
                        bind:members
                        {tiers}
                        {contactName}
                        {contactAddress}
                        {shirtsEnabled}
                        error={$errors.members?.[0]} />
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
                        bind:status />
                    {#if $errors.status?.[0]}
                        <p class="mt-2 text-sm text-destructive">{$errors.status[0]}</p>
                    {/if}
                </div>
            </div>
        </form>
    {/if}
</section>
