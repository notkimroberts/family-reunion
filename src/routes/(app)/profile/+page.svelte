<script lang="ts">
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
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
import { formatPrice, getInitials } from '$lib/utils'

let { data } = $props()

let birthDate = $state(data.profile?.birthDate ?? undefined)
</script>

<!-- Profile header -->
<section class="col-span-12">
    <Card>
        <CardContent class="pt-6 pb-6">
            <div
                class="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
                <Avatar class="h-20 w-20 shrink-0 text-2xl">
                    <AvatarFallback class="bg-primary text-primary-foreground text-2xl font-bold">
                        {getInitials(data.user.name ?? '?')}
                    </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                    <h1 class="text-2xl font-bold truncate">{data.user.name}</h1>
                    <p class="text-muted-foreground text-sm">{data.user.email}</p>
                    {#if data.registrations.length > 0}
                        <p class="text-muted-foreground text-sm mt-0.5">
                            {data.registrations.length}
                            {data.registrations.length === 1 ? 'registration' : 'registrations'}
                        </p>
                    {/if}
                </div>
                <Button href="/profile/relationships" variant="outline" size="sm" class="shrink-0">
                    Manage Relationships
                </Button>
            </div>
        </CardContent>
    </Card>
</section>

<!-- Personal info form -->
<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your contact details and mailing address.</CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/update_profile" use:enhance class="space-y-6">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <label for="name" class="text-sm font-medium">Name</label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            value={data.user.name ?? ''}
                            disabled />
                        <p class="text-xs text-muted-foreground">Managed by your SSO provider</p>
                    </div>
                    <div class="space-y-2">
                        <label for="email" class="text-sm font-medium">Email</label>
                        <Input id="email" type="email" value={data.user.email ?? ''} disabled />
                        <p class="text-xs text-muted-foreground">Managed by your SSO provider</p>
                    </div>
                    <div class="space-y-2">
                        <label for="birthDate" class="text-sm font-medium">Birthday</label>
                        <input type="hidden" name="birthDate" value={birthDate ?? ''} />
                        <DatePicker
                            id="birthDate"
                            bind:value={birthDate}
                            placeholder="Select your birthday" />
                    </div>
                    <div class="space-y-2">
                        <label for="phone" class="text-sm font-medium">Phone</label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={data.profile?.phone ?? ''}
                            placeholder="+1 (555) 000-0000" />
                    </div>
                </div>

                <Separator />

                <div>
                    <h3 class="text-sm font-semibold mb-4">Mailing Address</h3>
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label for="street" class="text-sm font-medium">Street</label>
                            <Input
                                id="street"
                                name="street"
                                type="text"
                                value={data.profile?.mailingAddress?.street ?? ''}
                                placeholder="123 Main St" />
                        </div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div class="space-y-2 md:col-span-1">
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
                                    value={data.profile?.mailingAddress?.state ?? ''}
                                    placeholder="TX" />
                            </div>
                            <div class="space-y-2">
                                <label for="zip" class="text-sm font-medium">ZIP</label>
                                <Input
                                    id="zip"
                                    name="zip"
                                    type="text"
                                    value={data.profile?.mailingAddress?.zip ?? ''}
                                    placeholder="00000" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end pt-2">
                    <Button type="submit">Save changes</Button>
                </div>
            </form>
        </CardContent>
    </Card>
</section>

<!-- Registration history -->
<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Registration History</CardTitle>
            <CardDescription>Your past and upcoming reunion registrations.</CardDescription>
        </CardHeader>
        <CardContent>
            {#if data.registrations.length === 0}
                <div class="flex flex-col items-center gap-3 py-8 text-center">
                    <p class="text-muted-foreground text-sm">No registrations yet.</p>
                    <Button href="/register" size="sm">Register for the next reunion</Button>
                </div>
            {:else}
                <div class="space-y-3 md:hidden">
                    {#each data.registrations as reg}
                        <div class="rounded-lg border p-4">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <p class="font-medium">{reg.eventTitle}</p>
                                    <p class="text-muted-foreground text-sm">{reg.eventYear}</p>
                                </div>
                                <div class="flex flex-col items-end gap-1 shrink-0">
                                    <Badge
                                        variant={reg.status === 'paid' ? 'default' : 'secondary'}>
                                        {reg.status}
                                    </Badge>
                                    <span class="text-sm font-medium">
                                        ${formatPrice(reg.totalAmountCents)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead class="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.registrations as reg}
                                <TableRow>
                                    <TableCell class="font-medium">{reg.eventTitle}</TableCell>
                                    <TableCell class="text-muted-foreground"
                                        >{reg.eventYear}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={reg.status === 'paid'
                                                ? 'default'
                                                : 'secondary'}>
                                            {reg.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell class="text-right font-mono">
                                        ${formatPrice(reg.totalAmountCents)}
                                    </TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/if}
        </CardContent>
    </Card>
</section>

<!-- Danger Zone — UI hidden, action preserved
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
-->
