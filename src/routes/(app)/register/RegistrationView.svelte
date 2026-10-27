<script module lang="ts">
/* null is "never recorded" — rows predate the question — and is deliberately not shown as
   "Standard": catering counts the vegetarians, so an unanswered row must read as unanswered. */
const mealLabel = (vegetarianMeal: boolean | null) => {
    if (vegetarianMeal === null) {
        return '—'
    }
    return vegetarianMeal ? 'Vegetarian' : 'Standard'
}
</script>

<script lang="ts">
import { CheckCircle2 } from '@lucide/svelte'
import { PriceWithCardFee } from '$lib/components'
import { Badge } from '$lib/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { REGISTRATION_STATUS_STYLES } from '$lib/general/constants/REGISTRATION_STATUS_STYLES'
import { sumAmountDue, sumMemberPrices } from '$lib/general/pricing'
import { formatPrice, getBookingDisplayStatus, toE164 } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'
import type { EventDetails, RegistrationDetails, RegistrationViewMember } from './types'

/* READ ONLY: the registrant's record of their own party, with no control that posts. Editing, adding,
   removing and cancelling are organizer actions now — see viewReflectsServerState.test.ts, which
   pins that and says why it matters. */
let {
    registration,
    members,
    event,
}: {
    registration: RegistrationDetails
    members: RegistrationViewMember[]
    event: EventDetails
} = $props()

let totalCents = $derived(sumMemberPrices(members))
/* People an organizer added after the booking was paid. Their places are in the total but have not
   been paid, so "paid" must leave them out. */
let amountDueCents = $derived(sumAmountDue(members))
let paidCents = $derived(totalCents - amountDueCents)
/* "Paid" beside "$165.00 still to pay" contradicts itself, so a paid booking that still owes shows
   Partly paid — the same rule as the organizers' list (getBookingDisplayStatus). */
let displayStatus = $derived(
    getBookingDisplayStatus({ status: registration.status, amountDueCents }),
)
</script>

<!-- Success banner -->
<div class="col-span-12">
    <div
        class="bg-card flex flex-col gap-3 rounded-xl border px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
            <CheckCircle2 class="mt-0.5 h-6 w-6 shrink-0 text-green-500" />
            <div>
                <p class="font-semibold">{event.title}</p>
                <p class="text-muted-foreground mt-0.5 text-sm">
                    {members.length}
                    {members.length === 1 ? 'person' : 'people'} registered ·
                    <span class="text-foreground font-medium">
                        ${formatPrice(paidCents)} paid
                    </span>
                    {#if amountDueCents > 0}
                        ·
                        <span class="font-medium text-amber-700 dark:text-amber-400">
                            ${formatPrice(amountDueCents)} still to pay
                        </span>
                    {/if}
                </p>
            </div>
        </div>
        <Badge
            variant={displayStatus === 'paid' ? 'default' : 'secondary'}
            class="self-start sm:self-auto">
            {REGISTRATION_STATUS_STYLES[displayStatus].label}
        </Badge>
    </div>
</div>

<!-- Party members card -->
<div class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Your Party</CardTitle>
        </CardHeader>
        <CardContent>
            <!-- Mobile cards -->
            <div class="space-y-3 md:hidden">
                {#each members as member (member.id)}
                    <div class="rounded-lg border px-4 py-3">
                        <p class="font-medium">{member.name}</p>
                        <p class="text-muted-foreground mt-0.5 text-sm">
                            {member.tierLabel}
                            {#if member.shirtSize}
                                · {member.shirtSize}
                            {/if}
                            · Meal: {mealLabel(member.vegetarianMeal)}
                        </p>
                        <p class="text-muted-foreground mt-0.5 text-sm">
                            Born {formatPartialBirthDate(
                                member.birthYear,
                                member.birthMonth,
                                member.birthDay,
                            ) ?? '—'}
                        </p>
                        <p class="mt-0.5 text-sm tabular-nums">
                            <PriceWithCardFee
                                priceCents={member.priceCents}
                                cardFeeCents={member.cardFeeCents} />
                            {#if member.paymentDue}
                                <span class="text-amber-700 dark:text-amber-400">
                                    · Payment needed
                                </span>
                            {/if}
                        </p>
                    </div>
                {/each}
            </div>

            <!-- Desktop table -->
            <div class="hidden overflow-x-auto md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Birthday</TableHead>
                            <TableHead>Registration Tier</TableHead>
                            <TableHead>T-Shirt</TableHead>
                            <TableHead>Meal</TableHead>
                            <TableHead>Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {#each members as member (member.id)}
                            <TableRow>
                                <TableCell class="font-medium">{member.name}</TableCell>
                                <TableCell>
                                    {formatPartialBirthDate(
                                        member.birthYear,
                                        member.birthMonth,
                                        member.birthDay,
                                    ) ?? '—'}
                                </TableCell>
                                <TableCell>{member.tierLabel}</TableCell>
                                <TableCell>{member.shirtSize || '—'}</TableCell>
                                <TableCell>{mealLabel(member.vegetarianMeal)}</TableCell>
                                <TableCell class="tabular-nums">
                                    <PriceWithCardFee
                                        priceCents={member.priceCents}
                                        cardFeeCents={member.cardFeeCents} />
                                    {#if member.paymentDue}
                                        <span
                                            class="block text-xs text-amber-700 dark:text-amber-400">
                                            Payment needed
                                        </span>
                                    {/if}
                                </TableCell>
                            </TableRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>

            <Separator class="my-4" />

            <div class="flex flex-col gap-1">
                <p class="text-sm font-medium">
                    Total paid:
                    <span class="tabular-nums">${formatPrice(paidCents)}</span>
                </p>
                {#if amountDueCents > 0}
                    <p class="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Still to pay:
                        <span class="tabular-nums">${formatPrice(amountDueCents)}</span>
                    </p>
                {/if}
            </div>
        </CardContent>
    </Card>
</div>

<!-- The only route to a change, now that none of them are self-service. -->
<div class="col-span-12">
    <p class="text-muted-foreground bg-card rounded-lg border px-4 py-3 text-sm">
        Need to add someone, correct a detail or cancel? Contact
        <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
        or text
        <a class="underline" href="sms:{toE164(CONTACT_PHONE)}">{CONTACT_PHONE}</a>
        and the reunion organizers will take care of it.
    </p>
</div>
