<script lang="ts">
import { enhance } from '$app/forms'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<section class="col-span-12 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/update_profile" use:enhance class="space-y-4">
                <div class="space-y-2">
                    <label for="name" class="text-sm font-medium">Name</label>
                    <Input id="name" name="name" type="text" value={data.user.name ?? ''} />
                </div>

                <div class="space-y-2">
                    <label for="email" class="text-sm font-medium">Email</label>
                    <Input id="email" type="email" value={data.user.email ?? ''} disabled />
                    <p class="text-xs text-muted-foreground">Managed by your SSO provider</p>
                </div>

                <div class="space-y-2">
                    <label for="phone" class="text-sm font-medium">Phone</label>
                    <Input id="phone" name="phone" type="tel" value={data.profile?.phone ?? ''} />
                </div>

                <Separator class="my-2" />
                <h3 class="text-sm font-bold text-muted-foreground">Mailing Address</h3>

                <div class="space-y-2">
                    <label for="street" class="text-sm font-medium">Street</label>
                    <Input
                        id="street"
                        name="street"
                        type="text"
                        value={data.profile?.mailingAddress?.street ?? ''} />
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <label for="city" class="text-sm font-medium">City</label>
                        <Input
                            id="city"
                            name="city"
                            type="text"
                            value={data.profile?.mailingAddress?.city ?? ''} />
                    </div>
                    <div class="space-y-2">
                        <label for="state" class="text-sm font-medium">State</label>
                        <Input
                            id="state"
                            name="state"
                            type="text"
                            value={data.profile?.mailingAddress?.state ?? ''} />
                    </div>
                </div>

                <div class="space-y-2 max-w-xs">
                    <label for="zip" class="text-sm font-medium">ZIP Code</label>
                    <Input
                        id="zip"
                        name="zip"
                        type="text"
                        value={data.profile?.mailingAddress?.zip ?? ''} />
                </div>

                <div class="flex justify-end mt-6 gap-4">
                    <Button type="submit">Save Profile</Button>
                </div>
            </form>
        </CardContent>
    </Card>
</section>

<section class="col-span-12 xl:col-span-4 self-start">
    <Card>
        <CardContent class="pt-6 flex flex-col items-center text-center">
            <Avatar class="w-20 h-20 mb-4">
                <AvatarFallback class="bg-primary text-primary-foreground text-3xl">
                    {(data.user.name ?? '?')[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <h3 class="font-semibold">{data.user.name}</h3>
            <p class="text-sm text-muted-foreground">{data.user.email}</p>
            <div class="mt-4 w-full">
                <Button href="/profile/relationships" variant="outline" size="sm" class="w-full">
                    Manage Relationships
                </Button>
            </div>
        </CardContent>
    </Card>
</section>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Registration History</CardTitle>
        </CardHeader>
        <CardContent>
            {#if data.registrations.length === 0}
                <p class="text-muted-foreground">No registrations yet.</p>
            {:else}
                <div class="space-y-3 md:hidden">
                    {#each data.registrations as reg}
                        <div class="rounded-lg border p-4">
                            <div class="flex items-center justify-between">
                                <span class="font-medium">{reg.eventTitle}</span>
                                <Badge variant={reg.status === 'paid' ? 'default' : 'secondary'}>
                                    {reg.status}
                                </Badge>
                            </div>
                            <div class="mt-2 flex justify-between text-sm text-muted-foreground">
                                <span>{reg.eventYear}</span>
                                <span>${formatPrice(reg.totalAmountCents)}</span>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.registrations as reg}
                                <TableRow>
                                    <TableCell>{reg.eventTitle}</TableCell>
                                    <TableCell>{reg.eventYear}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={reg.status === 'paid'
                                                ? 'default'
                                                : 'secondary'}>
                                            {reg.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>${formatPrice(reg.totalAmountCents)}</TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/if}
        </CardContent>
    </Card>
</section>

<section class="col-span-12">
    <Card class="border-destructive/20">
        <CardHeader>
            <CardTitle class="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
            <p class="text-sm text-muted-foreground mb-4">
                Deleting your account will hide your profile from all public views. An admin can
                still see your data for record-keeping purposes.
            </p>
            <div class="flex justify-end">
                <form
                    method="POST"
                    action="?/delete_account"
                    use:enhance={({ cancel }) => {
                        if (
                            !confirm('Are you sure? This hides your profile from all public views.')
                        ) {
                            cancel()
                        }
                    }}>
                    <Button type="submit" variant="destructive">Delete Account</Button>
                </form>
            </div>
        </CardContent>
    </Card>
</section>
