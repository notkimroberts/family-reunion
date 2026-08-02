<script lang="ts">
import { getContext } from 'svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import type { AdminContext } from '$lib/types/adminContext'
import type { RegistrationCategory } from '$lib/types/registrationCategory'
import { getCategoryPriceCents, isValidPhone } from '$lib/utils'
import OrderSummaryCard from '../../register/OrderSummaryCard.svelte'
import PartyMembersBuilder from '../../register/PartyMembersBuilder.svelte'
import YourInformationCard from '../../register/YourInformationCard.svelte'
import type { FormMember } from '../../register/types'

let { data, form } = $props()

const adminCtx = getContext<AdminContext>('admin')

let targetEventId = $derived(
    adminCtx.selectedEventId !== 'all' ? adminCtx.selectedEventId : (data.events[0]?.id ?? ''),
)

const adultPriceCents = $derived(data.events[0]?.adultPriceCents ?? 0)
const childPriceCents = $derived(data.events[0]?.childPriceCents ?? 0)

let selfFirstName = $state('')
let selfLastName = $state('')
let contactEmail = $state('')
let contactPhone = $state('')
let selfBirthDate = $state<string | undefined>(undefined)
let selfShirtSize = $state('')
let selfCategory = $state<RegistrationCategory | ''>('')
let status = $state<'paid' | 'pending' | 'waived'>('paid')
let members = $state<FormMember[]>([])
let submitted = $state(false)

let contactName = $derived(`${selfFirstName.trim()} ${selfLastName.trim()}`.trim())

let membersJson = $derived(
    JSON.stringify(
        members.map((m) => ({
            name: m.name,
            birthDate: m.birthDate ?? '',
            category: m.category,
            shirtSize: m.shirtSize || undefined,
        })),
    ),
)

function categoryPriceCents(category: RegistrationCategory): number {
    return getCategoryPriceCents(category, { adultPriceCents, childPriceCents })
}

let subtotal = $derived(
    (selfCategory ? categoryPriceCents(selfCategory) : 0) +
        members.reduce((sum, m) => sum + categoryPriceCents(m.category), 0),
)
let canSubmit = $derived(
    !!selfFirstName.trim() &&
        !!selfLastName.trim() &&
        !!contactEmail.trim() &&
        !!selfCategory &&
        (!contactPhone.trim() || isValidPhone(contactPhone)),
)

const shirtsEnabled = $derived(data.events[0]?.shirtsEnabled ?? false)

function handleSuccess() {
    selfFirstName = ''
    selfLastName = ''
    contactEmail = ''
    contactPhone = ''
    selfBirthDate = undefined
    selfShirtSize = ''
    selfCategory = ''
    status = 'paid'
    members = []
    submitted = true
    setTimeout(() => (submitted = false), 3000)
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
            Manually register someone who submitted on paper.
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
        {#if submitted || form?.success}
            <div
                class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                Registration added successfully.
            </div>
        {/if}

        {#if form?.error}
            <div
                class="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {form.error}
            </div>
        {/if}

        <form
            method="POST"
            use:enhance={() => {
                return ({ result, update }) => {
                    if (result.type === 'success') {
                        handleSuccess()
                    }
                    update({ reset: false })
                }
            }}>
            <input type="hidden" name="eventId" value={targetEventId} />
            <input type="hidden" name="contactName" value={contactName} />
            <input type="hidden" name="contactPhone" value={contactPhone} />
            <input type="hidden" name="selfCategory" value={selfCategory} />
            <input type="hidden" name="selfBirthDate" value={selfBirthDate ?? ''} />
            <input type="hidden" name="selfShirtSize" value={selfShirtSize} />
            <input type="hidden" name="members" value={membersJson} />

            <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-6">
                <!-- Left: party builder -->
                <div class="flex flex-col gap-4">
                    <YourInformationCard
                        bind:email={contactEmail}
                        bind:phone={contactPhone}
                        bind:firstName={selfFirstName}
                        bind:lastName={selfLastName}
                        bind:birthDate={selfBirthDate}
                        bind:shirtSize={selfShirtSize}
                        bind:category={selfCategory}
                        {adultPriceCents}
                        {childPriceCents}
                        {shirtsEnabled} />

                    <PartyMembersBuilder
                        bind:members
                        {adultPriceCents}
                        {childPriceCents}
                        {shirtsEnabled} />
                </div>

                <!-- Right: order summary (sticky on desktop) -->
                <div class="self-start lg:sticky lg:top-6">
                    <OrderSummaryCard
                        {contactName}
                        {selfCategory}
                        {members}
                        {adultPriceCents}
                        {childPriceCents}
                        {subtotal}
                        {canSubmit}
                        submitLabel="Add Registration"
                        placeholderText="Enter the contact's name, email, and birthday to get started."
                        contactSuffix="contact"
                        showStatus
                        bind:status />
                </div>
            </div>
        </form>
    {/if}
</section>
