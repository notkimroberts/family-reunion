<script lang="ts">
import { MapPin } from '@lucide/svelte'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { MAP_EMBED_URL } from '$lib/general/constants'
</script>

<Card>
    <CardHeader>
        <CardTitle class="flex items-center gap-2">
            <MapPin class="size-5" />
            Map & Directions
        </CardTitle>
    </CardHeader>
    <CardContent>
        <div class="relative aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
                src={MAP_EMBED_URL}
                title="Reunion map"
                loading="lazy"
                class="absolute inset-x-0 -top-16 h-[calc(100%+4rem)] w-full"></iframe>
        </div>
    </CardContent>
</Card>
