<script lang="ts">
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import { Textarea } from '$lib/components/ui/textarea'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<svelte:head>
    <title>Edit {data.event.title} — Admin</title>
</svelte:head>

<section class="col-span-12">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <a href="/admin/events" class="hover:text-foreground transition-colors">Events</a>
        <span>/</span>
        <span class="text-foreground font-medium">{data.event.title}</span>
    </div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
        <p class="text-muted-foreground text-sm">
            Year: {data.event.year} | Status: {data.event.status}
        </p>
        {#if data.event.status === 'open'}
            <Button href="/admin/registrations" size="sm">+ Add Paper Registration</Button>
        {/if}
    </div>
</section>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent>
            <form
                method="POST"
                action="?/update_pricing"
                use:enhance
                class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[auto_auto_auto] md:items-end">
                <div class="space-y-1">
                    <label for="adultPrice" class="text-xs font-medium text-muted-foreground"
                        >Adult price ($)</label>
                    <Input
                        id="adultPrice"
                        name="adultPrice"
                        type="number"
                        step="0.01"
                        value={formatPrice(data.event.adultPriceCents)}
                        required />
                </div>
                <div class="space-y-1">
                    <label for="childPrice" class="text-xs font-medium text-muted-foreground"
                        >Child price ($)</label>
                    <Input
                        id="childPrice"
                        name="childPrice"
                        type="number"
                        step="0.01"
                        value={formatPrice(data.event.childPriceCents)}
                        required />
                </div>
                <Button type="submit" size="sm">Save Pricing</Button>
            </form>
        </CardContent>
    </Card>
</section>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Program Details</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/update_event" use:enhance class="space-y-4">
                <Separator />
                <p class="text-sm font-bold text-muted-foreground">Event Dates</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label for="startDate" class="text-sm font-medium">Start Date</label>
                        <Input
                            id="startDate"
                            name="startDate"
                            type="datetime-local"
                            value={data.event.startDate
                                ? new Date(data.event.startDate).toISOString().slice(0, 16)
                                : ''} />
                    </div>
                    <div class="space-y-2">
                        <label for="endDate" class="text-sm font-medium">End Date</label>
                        <Input
                            id="endDate"
                            name="endDate"
                            type="datetime-local"
                            value={data.event.endDate
                                ? new Date(data.event.endDate).toISOString().slice(0, 16)
                                : ''} />
                    </div>
                </div>

                <Separator />
                <p class="text-sm font-bold text-muted-foreground">Venue</p>

                <div class="space-y-2">
                    <label for="venueName" class="text-sm font-medium">Venue Name</label>
                    <Input
                        id="venueName"
                        name="venueName"
                        type="text"
                        value={data.event.venue?.name ?? ''} />
                </div>
                <div class="space-y-2">
                    <label for="venueAddress" class="text-sm font-medium">Venue Address</label>
                    <Input
                        id="venueAddress"
                        name="venueAddress"
                        type="text"
                        value={data.event.venue?.address ?? ''} />
                </div>
                <div class="space-y-2">
                    <label for="venueDescription" class="text-sm font-medium"
                        >Venue Description</label>
                    <Textarea
                        id="venueDescription"
                        name="venueDescription"
                        value={data.event.venue?.description ?? ''} />
                </div>

                <Separator />
                <p class="text-sm font-bold text-muted-foreground">Menu & Drinks</p>

                <div class="space-y-2">
                    <label for="menu" class="text-sm font-medium">Menu (one item per line)</label>
                    <Textarea
                        id="menu"
                        name="menu"
                        class="h-24"
                        value={data.event.menu?.join('\n') ?? ''} />
                </div>
                <div class="space-y-2">
                    <label for="drinks" class="text-sm font-medium"
                        >Drinks (one item per line)</label>
                    <Textarea
                        id="drinks"
                        name="drinks"
                        class="h-24"
                        value={data.event.drinks?.join('\n') ?? ''} />
                </div>

                <Separator />
                <p class="text-sm font-bold text-muted-foreground">Schedule & Recommendations</p>

                <div class="space-y-2">
                    <label for="schedule" class="text-sm font-medium">Schedule (JSON array)</label>
                    <p class="text-xs text-muted-foreground">
                        [{`{"day":"Sat","time":"9am","activity":"Breakfast"}`}]
                    </p>
                    <Textarea
                        id="schedule"
                        name="schedule"
                        class="h-24"
                        value={data.event.schedule
                            ? JSON.stringify(data.event.schedule, null, 2)
                            : ''} />
                </div>
                <div class="space-y-2">
                    <label for="recommendedSites" class="text-sm font-medium"
                        >Recommended Sites (JSON array)</label>
                    <p class="text-xs text-muted-foreground">
                        [{`{"name":"Park","description":"Nice!"}`}]
                    </p>
                    <Textarea
                        id="recommendedSites"
                        name="recommendedSites"
                        class="h-24"
                        value={data.event.recommendedSites
                            ? JSON.stringify(data.event.recommendedSites, null, 2)
                            : ''} />
                </div>
                <div class="space-y-2">
                    <label for="recommendedActivities" class="text-sm font-medium"
                        >Recommended Activities (JSON array)</label>
                    <p class="text-xs text-muted-foreground">
                        [{`{"name":"Hiking","description":"Trail nearby"}`}]
                    </p>
                    <Textarea
                        id="recommendedActivities"
                        name="recommendedActivities"
                        class="h-24"
                        value={data.event.recommendedActivities
                            ? JSON.stringify(data.event.recommendedActivities, null, 2)
                            : ''} />
                </div>

                <Button type="submit">Save Program</Button>
            </form>
        </CardContent>
    </Card>
</section>

<section class="col-span-12">
    <Button href="/admin/events" variant="ghost">&larr; Back to Events</Button>
</section>
