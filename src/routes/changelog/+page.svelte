<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'

type Props = {
    data: {
        html: string
    }
}

let { data }: Props = $props()
</script>

<PageTitle title="Changelog" />

<div class="container mx-auto max-w-3xl px-4 py-8">
    <article class="prose prose-sm max-w-none">
        {@html data.html}
    </article>
</div>
