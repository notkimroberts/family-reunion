<script lang="ts">
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import { APP_NAME } from '$lib/general/constants'
import { getInitials } from '$lib/utils'

let { data } = $props()

let birthDate = $state(data.profile?.birthDate ?? undefined)
</script>

<svelte:head>
    <title>Profile — {APP_NAME}</title>
</svelte:head>
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
                </div>
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
