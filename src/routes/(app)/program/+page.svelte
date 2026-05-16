<script lang="ts">
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'

let { data } = $props()
</script>

{#if !data.event}
    <section class="col-span-12 text-center py-12">
        <h2 class="text-2xl font-bold mb-4">No Active Reunion</h2>
        <p class="text-muted-foreground">Check back soon for details about the next reunion!</p>
    </section>
{:else}
    <section class="col-span-12">
        <Card class="bg-primary text-primary-foreground">
            <CardContent class="pt-6">
                <h2 class="text-2xl font-bold mb-2">{data.event.title}</h2>
                <Badge variant="secondary">{data.registrantCount} registered households</Badge>
            </CardContent>
        </Card>
    </section>

    {#if data.event.venue}
        <section class="col-span-12 xl:col-span-6">
            <Card>
                <CardHeader>
                    <CardTitle>Venue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p class="text-xl font-semibold">{data.event.venue.name}</p>
                    <p class="text-muted-foreground">{data.event.venue.address}</p>
                    {#if data.event.venue.description}
                        <p class="mt-2">{data.event.venue.description}</p>
                    {/if}
                    {#if data.event.venue.imageUrl}
                        <img
                            src={data.event.venue.imageUrl}
                            alt={data.event.venue.name}
                            class="rounded-lg mt-4 max-h-64 object-cover" />
                    {/if}
                </CardContent>
            </Card>
        </section>
    {/if}

    {#if data.event.schedule && data.event.schedule.length > 0}
        <section class="col-span-12" class:xl:col-span-6={data.event.venue}>
            <Card>
                <CardHeader>
                    <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3 md:hidden">
                        {#each data.event.schedule as item}
                            <div class="rounded-lg border p-3">
                                <div class="font-medium">{item.activity}</div>
                                <div class="mt-1 text-sm text-muted-foreground">
                                    {item.day} &middot; {item.time}
                                </div>
                            </div>
                        {/each}
                    </div>
                    <div class="hidden overflow-x-auto md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Day</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Activity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {#each data.event.schedule as item}
                                    <TableRow>
                                        <TableCell>{item.day}</TableCell>
                                        <TableCell>{item.time}</TableCell>
                                        <TableCell>{item.activity}</TableCell>
                                    </TableRow>
                                {/each}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </section>
    {/if}

    {#if data.event.menu && data.event.menu.length > 0}
        <section class="col-span-12 xl:col-span-6">
            <Card>
                <CardHeader>
                    <CardTitle>Menu</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul class="list-disc list-inside space-y-1">
                        {#each data.event.menu as item}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </CardContent>
            </Card>
        </section>
    {/if}

    {#if data.event.drinks && data.event.drinks.length > 0}
        <section class="col-span-12 xl:col-span-6">
            <Card>
                <CardHeader>
                    <CardTitle>Drinks</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul class="list-disc list-inside space-y-1">
                        {#each data.event.drinks as item}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </CardContent>
            </Card>
        </section>
    {/if}

    {#if data.event.recommendedSites && data.event.recommendedSites.length > 0}
        <section class="col-span-12 xl:col-span-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recommended Sites</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul class="space-y-2">
                        {#each data.event.recommendedSites as site}
                            <li>
                                <p class="font-medium">{site.name}</p>
                                {#if site.description}
                                    <p class="text-sm text-muted-foreground">{site.description}</p>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </CardContent>
            </Card>
        </section>
    {/if}

    {#if data.event.recommendedActivities && data.event.recommendedActivities.length > 0}
        <section class="col-span-12 xl:col-span-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recommended Activities</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul class="space-y-2">
                        {#each data.event.recommendedActivities as activity}
                            <li>
                                <p class="font-medium">{activity.name}</p>
                                {#if activity.description}
                                    <p class="text-sm text-muted-foreground">
                                        {activity.description}
                                    </p>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </CardContent>
            </Card>
        </section>
    {/if}

    <section class="col-span-12 text-center">
        <Button href="/register" size="lg">Register Now</Button>
    </section>
{/if}
