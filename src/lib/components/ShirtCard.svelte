<script lang="ts">
// The reunion shirt: sold at the reunion, not part of registration.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'

const SHIRT_IMAGES = [
    { label: 'Back', src: '/brand/shirt-back.jpg' },
    { label: 'Front', src: '/brand/shirt-front.jpg' },
]
</script>

<Card class="md:col-span-2">
    <CardHeader class="flex flex-col gap-2">
        <CardTitle>Oakland x Mississippi Reunion Shirt</CardTitle>
        <CardDescription>
            Sneak peek! Buy one on-site at the reunion. The shirt size you choose for each person on
            the form helps us order enough of each size, but we cannot promise your size will be
            available.
        </CardDescription>
    </CardHeader>
    <CardContent>
        <div class="flex gap-4">
            {#each SHIRT_IMAGES as image (image.label)}
                <!-- Label on the photo, not under it, so this card is no taller than the tote's. -->
                <figure class="relative min-w-0 flex-1">
                    <img
                        src={image.src}
                        alt="Reunion shirt, {image.label.toLowerCase()}"
                        class="aspect-[4/5] w-full rounded-lg object-cover" />
                    <figcaption
                        class="bg-card/90 absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs font-medium">
                        {image.label}
                    </figcaption>
                </figure>
            {/each}
        </div>
    </CardContent>
</Card>
