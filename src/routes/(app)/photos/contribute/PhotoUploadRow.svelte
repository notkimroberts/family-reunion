<script lang="ts">
import { CircleAlert, CircleCheck, Clock, LoaderCircle } from '@lucide/svelte'
import { Progress } from '$lib/components/ui/progress'
import type { PhotoUpload } from './types'

type Props = { upload: PhotoUpload }
let { upload }: Props = $props()

const percent = $derived(
    upload.file.size > 0 ? Math.round((upload.sentBytes / upload.file.size) * 100) : 0,
)
</script>

<li class="flex flex-col gap-1 py-2">
    <div class="flex items-center gap-2 text-sm">
        {#if upload.status === 'done'}
            <CircleCheck class="text-primary size-4 shrink-0" aria-hidden="true" />
        {:else if upload.status === 'failed'}
            <CircleAlert class="text-destructive size-4 shrink-0" aria-hidden="true" />
        {:else if upload.status === 'uploading'}
            <LoaderCircle
                class="text-muted-foreground size-4 shrink-0 animate-spin"
                aria-hidden="true" />
        {:else}
            <Clock class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        {/if}
        <span class="min-w-0 flex-1 truncate">{upload.file.name}</span>
        <span class="text-muted-foreground shrink-0 tabular-nums">
            {#if upload.status === 'done'}
                Sent
            {:else if upload.status === 'failed'}
                Not sent
            {:else if upload.status === 'uploading'}
                {percent}%
            {:else}
                Waiting
            {/if}
        </span>
    </div>
    {#if upload.status === 'uploading'}
        <Progress value={percent} max={100} class="h-1" />
    {/if}
    {#if upload.status === 'failed' && upload.error}
        <p class="text-destructive pl-6 text-sm">{upload.error}</p>
    {/if}
</li>
