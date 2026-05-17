<script lang="ts">
import { Card, CardContent } from '$lib/components/ui/card'
import { APP_NAME } from '$lib/general/constants'

type Props = {
    data: {
        html: string
    }
}

let { data }: Props = $props()
</script>

<svelte:head>
    <title>Changelog — {APP_NAME}</title>
</svelte:head>

<Card class="col-span-12 xl:col-span-8 xl:col-start-3">
    <CardContent class="pt-6">
        <article class="prose prose-sm max-w-none">
            {@html data.html}
        </article>
    </CardContent>
</Card>
