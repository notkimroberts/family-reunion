<script lang="ts">
import { ArrowLeft, Download } from '@lucide/svelte'
import { page } from '$app/state'
import { Button } from '$lib/components/ui/button'
import { APP_NAME } from '$lib/general/constants'
import type { PageData } from './$types'

type Props = { data: PageData }
let { data }: Props = $props()

let title = $derived(data.photo.caption ?? `Photograph from the ${APP_NAME}`)
/* Absolute, because og:image is fetched by a crawler that has no page context to resolve against. */
let imageUrl = $derived(new URL(`/api/photos/${data.photo.id}/display`, page.url.origin).href)
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={title} />
    <meta property="og:type" content="article" />
    <meta property="og:title" content={title} />
    <meta property="og:image" content={imageUrl} />
    <meta property="og:image:width" content={String(data.photo.width)} />
    <meta property="og:image:height" content={String(data.photo.height)} />
    <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<section class="col-span-12 flex flex-col gap-4">
    <a
        href="/photos"
        class="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ArrowLeft class="size-4" />
        All photos
    </a>

    <img
        src="/api/photos/{data.photo.id}/display"
        alt={data.photo.caption ?? 'Family reunion photograph'}
        width={data.photo.width}
        height={data.photo.height}
        class="bg-muted max-h-[75vh] w-full rounded-lg object-contain" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-1">
            {#if data.photo.caption}
                <p class="break-words">{data.photo.caption}</p>
            {/if}
            <p class="text-muted-foreground text-sm">
                {#if data.photo.takenYear}{data.photo.takenYear}{/if}
                {#if data.photo.takenYear && data.photo.contributorName}·{/if}
                {#if data.photo.contributorName}Shared by {data.photo.contributorName}{/if}
            </p>
        </div>

        <Button href="/api/photos/{data.photo.id}/display?download" class="shrink-0">
            <Download class="size-4" />
            Download
        </Button>
    </div>
</section>
