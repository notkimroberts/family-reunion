<script lang="ts">
import { Button } from '$lib/components/ui/button'
import { APP_NAME } from '$lib/general/constants'
</script>

<svelte:head>
    <title>{APP_NAME} — Family Reunion</title>
    <meta
        name="description"
        content="Family reunion management — registration, events, and family tree" />
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center">
    <div class="text-center max-w-lg px-6">
        <h1 class="text-5xl font-bold text-primary mb-6">{APP_NAME}</h1>
        <p class="text-lg text-muted-foreground mb-8">
            Bringing our family together, year after year. Register for the next reunion, explore
            the family tree, and relive memories through our photo gallery.
        </p>
        <Button href="/login" size="lg">Sign In to Get Started</Button>
    </div>
</div>
