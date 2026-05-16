<script lang="ts">
import { Card, CardContent } from '$lib/components/ui/card'

type Props = {
    data: {
        html: string
    }
}

let { data }: Props = $props()
</script>

<Card class="col-span-12 xl:col-span-8 xl:col-start-3">
    <CardContent class="pt-6">
        <article class="prose prose-sm max-w-none">
            {@html data.html}
        </article>
    </CardContent>
</Card>
