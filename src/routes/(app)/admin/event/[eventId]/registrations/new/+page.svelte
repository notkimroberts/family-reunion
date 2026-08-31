<script lang="ts">
import { Check, Copy, TriangleAlert } from '@lucide/svelte'
import * as Sentry from '@sentry/sveltekit'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { HOST_HOTEL } from '$lib/general/constants'
import { quotePartyTotal } from '$lib/general/pricing'
import { defaultAdultTierId } from '$lib/general/tiers'
import { getTierPriceCents } from '$lib/utils'
import DonationCard from '../../../../../register/DonationCard.svelte'
import { EMPTY_PERSON_DETAILS } from '../../../../../register/EMPTY_PERSON_DETAILS'
import FormErrorSummary from '../../../../../register/FormErrorSummary.svelte'
import HostHotelStayCard from '../../../../../register/HostHotelStayCard.svelte'
import OrderSummaryCard from '../../../../../register/OrderSummaryCard.svelte'
import PartyMembersBuilder from '../../../../../register/PartyMembersBuilder.svelte'
import YourInformationCard from '../../../../../register/YourInformationCard.svelte'
import { isContactComplete } from '../../../../../register/isContactComplete'
import { adminRegistrationSchema } from '../../../../../register/schema'
import type { FormMember, PersonDetails } from '../../../../../register/types'

let { data, form: actionData } = $props()

/* superforms' $form is a STORE, not $state, so $form.self is a plain object and binding to its
   nested properties is untrackable ("binding_property_non_reactive"). See the fuller note on the
   public register page: $state is the editing surface, and exactly ONE sync into $form happens in
   onSubmit — which superforms runs before client validation, so validators still see fresh data,
   and dataType 'json' means nothing is mirrored into the DOM. */
const { form, errors, message, submitting, enhance } = superForm(data.form, {
    validators: zodClient(adminRegistrationSchema),
    dataType: 'json',
    /* Superforms swallows a failed submit into $errors and, for a transport/server error, into
       onError. Neither was surfaced, so every failure looked like an inert button. FormErrorSummary
       shows the validation half; this reports the rest. */
    onError: ({ result }) => {
        Sentry.captureException(
            new Error(
                `admin paper registration submit failed: ${result.error?.message ?? 'unknown'}`,
            ),
            { tags: { source: 'superforms-onError' }, extra: { status: result.status } },
        )
    },
    /* A new success collapses the form again, so the banner is never shown above a populated one. */
    onUpdated: ({ form: updated }) => {
        if (updated.valid) {
            addingAnother = false
        }
    },
    onSubmit: () => {
        $form.eventId = targetEventId
        $form.self = { ...self }
        $form.members = members.map((member) => ({ ...member }))
        $form.donationCents = donationCents
    },
    /* handleReset clears state explicitly, so superforms must not also reset $form out from under
       the success banner, which reads the returned manage URL. */
    resetForm: false,
})

/* The event in the URL, via the layout that loaded it — `page.params.eventId` is `string | undefined`
   across all routes, and this must be a definite id.

   It used to come from the year filter while the loader took tiers from the OPEN event, so arriving from
   a non-open year posted one event's id with another's tier ids and the save fail-closed. */
let targetEventId = $derived(data.event.id)

const tiers = $derived(data.tiers)

/* The contact is an adult by rule, so their tier starts on the first adult one rather than on the
   blank prompt. A function, not a constant: handleReset needs a fresh object, and sharing one would
   let an edit to the previous registrant's details leak into the next form. */
const blankSelf = (): PersonDetails => ({
    ...EMPTY_PERSON_DETAILS,
    tierId: defaultAdultTierId(data.tiers),
})

let self = $state<PersonDetails>(blankSelf())
let members = $state<FormMember[]>([])
/* A gift that arrived with the paper form or the cheque. Cents, like the public form. */
let donationCents = $state(0)
let copied = $state(false)
/* The confirmation and the form are mutually exclusive: a success replaces the form with the
   registrant's management link, and "Add another" swaps back. Derived as one value rather than two
   flags so they cannot both be on screen — a stale confirmation above a blank form invites the
   admin to copy the previous registrant's link. actionData persists after the action returns, so
   success alone cannot decide; addingAnother is what dismisses it. */
let addingAnother = $state(false)
let confirmation = $derived(actionData?.success && !addingAnother ? actionData : undefined)
let showForm = $derived(!confirmation)
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

/* applyStripeFee: false — a paper entry took no card payment, so there is no processing fee to
   quote. Same module as the public form, one flag apart. */
let quote = $derived(
    quotePartyTotal(
        [
            ...(self.tierId ? [getTierPriceCents(self.tierId, tiers)] : []),
            ...members.map((member) => getTierPriceCents(member.tierId, tiers)),
        ],
        { applyStripeFee: false, donationCents },
    ),
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
    $form.stayingAtHostHotel = HOST_HOTEL ? '' : 'undecided'
    self = blankSelf()
    members = []
    donationCents = 0
    contactSaved = false
    copied = false
    addingAnother = true
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
        <a
            href="/admin/event/{data.event.id}/registrations"
            class="text-muted-foreground hover:text-foreground text-sm">← Registrations</a>
        <h1>Add Paper Registration</h1>
        <p class="text-muted-foreground text-sm">
            Manually register someone who submitted on paper. The same details are required as the
            public form, so catering and shirt counts stay complete.
        </p>
    </div>

    {#if confirmation}
        <div
            class="mb-4 flex flex-col gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
            <p class="font-medium">Registration added.</p>

            {#if confirmation.emailSent}
                <p>A confirmation email was sent with their management link.</p>
            {:else}
                <p class="flex items-start gap-2">
                    <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        The registration was saved, but the confirmation email did not send{confirmation.emailError
                            ? ` (${confirmation.emailError})`
                            : ''}. Pass the link below on directly.
                    </span>
                </p>
            {/if}

            <!-- Shown even on success: the plaintext token exists only in this response. -->
            <div class="flex flex-col gap-2">
                <span class="text-xs font-semibold tracking-wide uppercase">Management link</span>
                <div class="flex flex-wrap items-center gap-2">
                    <code
                        class="bg-background/60 min-w-0 flex-1 rounded px-2 py-1.5 text-xs break-all">
                        {confirmation.manageUrl}
                    </code>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onclick={() => handleCopy(confirmation.manageUrl)}>
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

    {#if showForm}
        <form method="POST" use:enhance>
            <div class="mb-4">
                <FormErrorSummary errors={$errors} message={$message} />
            </div>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
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
                        errors={{
                            email: $errors.contactEmail?.[0],
                            name: $errors.contactFirstName?.[0] ?? $errors.contactLastName?.[0],
                        }} />

                    <PartyMembersBuilder
                        bind:members
                        {tiers}
                        {contactName}
                        {contactAddress}
                        error={$errors.members?._errors?.[0]} />

                    <HostHotelStayCard
                        bind:stayingAtHostHotel={$form.stayingAtHostHotel}
                        error={$errors.stayingAtHostHotel?.[0]} />

                    <DonationCard bind:donationCents error={$errors.donationCents?.[0]} />
                </div>

                <!-- Right: order summary (sticky on desktop) -->
                <div class="self-start lg:sticky lg:top-6">
                    <OrderSummaryCard
                        {contactName}
                        selfTierId={self.tierId}
                        {members}
                        {tiers}
                        {quote}
                        {canSubmit}
                        submitLabel="Add Registration"
                        submitting={$submitting}
                        submittingLabel="Adding…"
                        placeholderText="Fill in the contact's details above and press Save to continue."
                        contactSuffix="contact"
                        showStatus
                        bind:status={$form.status} />
                    {#if $errors.status?.[0]}
                        <p class="text-destructive mt-2 text-sm">{$errors.status[0]}</p>
                    {/if}
                </div>
            </div>
        </form>
    {/if}
</section>
