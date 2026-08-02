<script lang="ts">
import { Facebook } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { FACEBOOK_EVENT_URL, FACEBOOK_GROUP_URL } from '$lib/general/constants'
</script>

<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <Card class="h-full">
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Facebook class="size-5" />
                Join the Family Group
            </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            <p class="text-muted-foreground text-sm">
                Connect with the Patterson family on Facebook for reunion updates, photos, and
                conversation year-round.
            </p>
            <Button
                href={FACEBOOK_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="w-full sm:w-auto">
                Join the Group &rarr;
            </Button>
        </CardContent>
    </Card>

    <Card class="h-full">
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Facebook class="size-5" />
                Reunion Event
            </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            <p class="text-muted-foreground text-sm">
                RSVP on Facebook and get event details, updates, and reminders as the date
                approaches.
            </p>
            <Button
                href={FACEBOOK_EVENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="w-full sm:w-auto">
                View Event &amp; RSVP &rarr;
            </Button>
        </CardContent>
    </Card>
</div>
