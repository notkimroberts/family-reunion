<script lang="ts">
import { HeartHandshake } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { APP_NAME } from '$lib/general/constants'

/* Deliberately says nothing about the gift itself — no amount, no name, no id in the URL. The page
   is reachable by anyone who types the address, so anything it printed about a donor would be
   readable by a stranger. The receipt in the donor's inbox is where the detail belongs. */
</script>

<svelte:head>
    <title>Thank you — {APP_NAME}</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<section class="col-span-12 mx-auto w-full max-w-lg">
    <Card>
        <CardContent class="flex flex-col items-center gap-4 py-10 text-center">
            <div class="text-primary bg-primary/10 rounded-full p-3">
                <HeartHandshake class="size-7" />
            </div>
            <h1 class="text-2xl font-bold tracking-tight">Thank you</h1>
            <p class="text-muted-foreground text-sm">
                Your gift went through. A receipt is on its way to your email — it can take a minute
                or two to arrive.
            </p>
            <div class="flex flex-col gap-2 sm:flex-row">
                <Button href="/">Back to home</Button>
                <Button href="/register" variant="outline">Register for the reunion</Button>
            </div>
        </CardContent>
    </Card>
</section>
