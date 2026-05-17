<script lang="ts">
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

let { data } = $props()
</script>

<svelte:head>
    <title>Registration Confirmed — {APP_NAME}</title>
</svelte:head>

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
                            <TableHead>Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {#each data.members as member}
                            <TableRow>
                                <TableCell>{member.name}</TableCell>
                                <TableCell>
                                    {member.birthDate ? getAgeFromDate(member.birthDate) : '—'}
                                </TableCell>
                                <TableCell>{member.tierLabel}</TableCell>
                                <TableCell>${formatPrice(member.priceCents)}</TableCell>
                            </TableRow>
                        {/each}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colspan={3} class="text-right font-bold"
                                >Total Paid:</TableCell>
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
