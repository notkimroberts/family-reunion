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
            Shirts are not included in registration. They will be sold at the reunion. The shirt
            size you choose for each person on the form helps us order enough of each size, but we
            cannot promise your size will be available.
        </CardDescription>
    </CardHeader>
    <CardContent>
        <div class="flex gap-4">
            {#each SHIRT_IMAGES as image (image.label)}
                <figure class="flex min-w-0 flex-1 flex-col gap-2">
                    <img
                        src={image.src}
                        alt="Reunion shirt, {image.label.toLowerCase()}"
                        class="aspect-[4/5] w-full rounded-lg object-cover" />
                    <figcaption class="text-muted-foreground text-sm">{image.label}</figcaption>
                </figure>
            {/each}
        </div>
    </CardContent>
</Card>
