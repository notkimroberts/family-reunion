<script lang="ts">
import { LoaderCircle } from '@lucide/svelte'
import { untrack } from 'svelte'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { APP_NAME } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import { getAgeFromDate } from '$lib/utils/age'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30000

let { data } = $props()

let status = $state(untrack(() => data.registration.status))
let timedOut = $state(false)

$effect(() => {
    if (status !== 'pending') {
        return
    }

    const start = Date.now()
    const interval = setInterval(async () => {
        if (Date.now() - start > POLL_TIMEOUT_MS) {
            timedOut = true
            clearInterval(interval)
            return
        }

        const res = await fetch(`/api/registration/${data.registration.id}/status`)
        if (res.ok) {
            const body = await res.json()
            if (body.status !== 'pending') {
                status = body.status
                clearInterval(interval)
            }
        }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
})
</script>

<svelte:head>
    <title>Registration Confirmed — {APP_NAME}</title>
</svelte:head>

{#if status === 'pending' && !timedOut}
    <section class="col-span-12 text-center">
        <LoaderCircle class="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
        <h2 class="text-2xl font-bold">Processing Payment…</h2>
        <p class="text-muted-foreground mt-2">Hang tight, we're confirming your payment.</p>
    </section>
{:else if timedOut}
    <section class="col-span-12 text-center">
        <h2 class="text-2xl font-bold">Payment Is Processing</h2>
        <p class="text-muted-foreground mt-2">
            This is taking longer than expected. You'll receive a confirmation email once your
            payment is confirmed.
        </p>
    </section>

    <section class="col-span-12 flex justify-center">
        <Button href="/">Go Home</Button>
    </section>
{:else}
    <section class="col-span-12 text-center">
        <h2 class="text-3xl font-bold text-primary">You're Registered!</h2>
        <p class="text-lg mt-2">See you at {data.event.title}!</p>
    </section>

    <section class="col-span-12 xl:col-span-8 xl:col-start-3">
        <Card>
            <CardHeader>
                <CardTitle>Registration Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div class="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Age</TableHead>
                                <TableHead>Category</TableHead>
                                {#if data.members.some((m) => m.shirtSize)}
                                    <TableHead>T-shirt</TableHead>
                                {/if}
                                <TableHead>Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.members as member, i (i)}
                                <TableRow>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>
                                        {member.birthDate ? getAgeFromDate(member.birthDate) : '—'}
                                    </TableCell>
                                    <TableCell>{member.tierLabel}</TableCell>
                                    {#if data.members.some((m) => m.shirtSize)}
                                        <TableCell>{member.shirtSize || '—'}</TableCell>
                                    {/if}
                                    <TableCell>${formatPrice(member.priceCents)}</TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell
                                    colspan={data.members.some((m) => m.shirtSize) ? 4 : 3}
                                    class="text-right font-bold">Total Paid:</TableCell>
                                <TableCell class="font-bold">
                                    ${formatPrice(data.registration.totalAmountCents)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                <p class="text-sm text-muted-foreground mt-4">
                    A confirmation email has been sent to your email address.
                </p>
            </CardContent>
        </Card>
    </section>

    <section class="col-span-12 flex gap-4 justify-center">
        <Button href="/program">View Program</Button>
        <Button href="/profile" variant="ghost">My Profile</Button>
    </section>
{/if}
