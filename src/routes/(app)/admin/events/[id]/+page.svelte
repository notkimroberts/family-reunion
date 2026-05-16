<script lang="ts">
import { enhance } from '$app/forms'
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
import { Textarea } from '$lib/components/ui/textarea'
import { formatPrice } from '$lib/utils'

let { data } = $props()
</script>

<svelte:head>
    <title>Edit {data.event.title} — Admin</title>
</svelte:head>

<section class="col-span-12">
    <p class="text-muted-foreground">
        Year: {data.event.year} | Status: {data.event.status}
    </p>
</section>

<section class="col-span-12">
    <Card>
        <CardHeader>
            <CardTitle>Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent>
            {#if data.tiers.length > 0}
                <div class="mb-4 space-y-3 md:hidden">
                    {#each data.tiers as tier}
                        <div class="rounded-lg border p-3">
                            <div class="flex items-center justify-between">
                                <span class="font-medium">{tier.label}</span>
                                <form method="POST" action="?/delete_tier" use:enhance>
                                    <input type="hidden" name="tierId" value={tier.id} />
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="sm"
                                        class="text-destructive hover:text-destructive h-6 px-2">
                                        Delete
                                    </Button>
                                </form>
                            </div>
                            <div class="mt-1 flex gap-4 text-sm text-muted-foreground">
                                <span>Ages {tier.minAge}–{tier.maxAge ?? '∞'}</span>
                                <span class="ml-auto font-medium text-foreground">
                                    ${formatPrice(tier.priceCents)}
                                </span>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="mb-4 hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead>Min Age</TableHead>
                                <TableHead>Max Age</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.tiers as tier}
                                <TableRow>
                                    <TableCell>{tier.label}</TableCell>
                                    <TableCell>{tier.minAge}</TableCell>
                                    <TableCell>{tier.maxAge ?? '∞'}</TableCell>
                                    <TableCell>${formatPrice(tier.priceCents)}</TableCell>
                                    <TableCell>
                                        <form method="POST" action="?/delete_tier" use:enhance>
                                            <input type="hidden" name="tierId" value={tier.id} />
                                            <Button
                                                type="submit"
                                                variant="ghost"
                                                size="sm"
                                                class="text-destructive hover:text-destructive h-6 px-2">
                                                Delete
                                            </Button>
                                        </form>
                                    </TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/if}

            <form
                method="POST"
                action="?/add_tier"
                use:enhance
                class="grid grid-cols-2 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
                <div class="col-span-2 md:col-span-1 space-y-1">
                    <label for="tierLabel" class="text-xs font-medium text-muted-foreground"
                        >Label</label>
                    <Input id="tierLabel" name="label" type="text" placeholder="Adult" required />
                </div>
                <div class="space-y-1">
                    <label for="tierMinAge" class="text-xs font-medium text-muted-foreground"
                        >Min Age</label>
                    <Input id="tierMinAge" name="minAge" type="number" value="0" required />
                </div>
                <div class="space-y-1">
                    <label for="tierMaxAge" class="text-xs font-medium text-muted-foreground"
                        >Max Age</label>
                    <Input id="tierMaxAge" name="maxAge" type="number" placeholder="∞" />
                </div>
                <div class="space-y-1">
                    <label for="tierPrice" class="text-xs font-medium text-muted-foreground"
                        >Price ($)</label>
                    <Input id="tierPrice" name="price" type="number" step="0.01" required />
                </div>
                <Button type="submit" size="sm" class="col-span-2 md:col-span-1">Add Tier</Button>
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
                <h3 class="text-sm font-bold text-muted-foreground">Event Dates</h3>

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
                <h3 class="text-sm font-bold text-muted-foreground">Venue</h3>

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
                <h3 class="text-sm font-bold text-muted-foreground">Menu & Drinks</h3>

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
                <h3 class="text-sm font-bold text-muted-foreground">Schedule & Recommendations</h3>

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
