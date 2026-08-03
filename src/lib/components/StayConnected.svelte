<script lang="ts">
import { FacebookIcon } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { FACEBOOK_EVENT_URL, FACEBOOK_GROUP_URL } from '$lib/general/constants'
</script>

<Card class="h-full">
    <CardHeader>
        <CardTitle class="flex items-center gap-2">
            <FacebookIcon class="size-5" />
            Join the Family Group
        </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
        <p class="text-muted-foreground text-sm">
            The Patterson Family Page: descendants of Will &amp; Roxie Patterson, married December
            26, 1890. Connect for reunion updates, photos, and conversation year-round.
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
            <FacebookIcon class="size-5" />
            Patterson Family Reunion 2027
        </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
        <p class="text-muted-foreground text-sm">
            RSVP on Facebook and get event details, updates, and reminders as the date approaches.
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
