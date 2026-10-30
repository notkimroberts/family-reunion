<script lang="ts">
// The reunion tote: sold at the reunion, not part of registration.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
</script>

<Card>
    <CardHeader class="flex flex-col gap-2">
        <CardTitle>Oakland x Mississippi Reunion Tote</CardTitle>
        <CardDescription>Sneak peek! Buy one on site at the reunion.</CardDescription>
    </CardHeader>
    <!-- Beside the shirt card the photo fills whatever height the row gives it, so neither card
         ends in empty space. The sage fill is the photo's own backdrop, so object-contain shows no
         seam. -->
    <CardContent class="flex flex-1">
        <img
            src="/brand/tote.jpg"
            alt="Reunion tote bag"
            class="aspect-[4/5] min-h-0 w-full rounded-lg bg-[#c7c9bc] object-contain md:aspect-auto md:h-full" />
    </CardContent>
</Card>
