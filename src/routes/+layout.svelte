<script lang="ts">
import * as Sentry from '@sentry/sveltekit'
import { onMount } from 'svelte'
import { Button } from '$lib/components/ui/button'
import { CONTACT_EMAIL } from '$lib/general/constants'
import { theme } from '$lib/stores/theme.svelte'
import '../app.css'
import { formatError } from './formatError'

let { children } = $props()

onMount(() => {
    theme.init()
})

/* Reports errors thrown while rendering or running effects.

   SvelteKit's client `handleError` hook does NOT fire for these — it covers load and navigation
   only — and Svelte does not let them reach window.onerror, so Sentry's globalHandlers
   integration never saw them either. A TypeError inside a $derived therefore blanked the page
   leaving nothing but a console line, which is how the contactEmail crash reached production
   unnoticed.

   Deliberately not covered here: event handlers, setTimeout and other async work. Those DO reach
   window.onerror, so Sentry's default globalHandlers integration already reports them. */
function handleRenderError(error: unknown) {
    Sentry.captureException(error, {
        tags: { source: 'svelte-boundary' },
        extra: { url: typeof location !== 'undefined' ? location.href : undefined },
    })
}
</script>

<svelte:boundary onerror={handleRenderError}>
    {@render children()}

    {#snippet failed(error, reset)}
        <!-- The boundary discards its content once it handles an error, so without this the page
             would simply be blank. Kept dependency-light: whatever just broke may be inside the
             layout it replaces. -->
        <div class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
            <h1>Something went wrong</h1>
            <p class="text-muted-foreground max-w-md text-sm">
                This page hit an unexpected error, and it has been reported. Trying again often
                clears it.
            </p>
            <div class="flex flex-wrap items-center justify-center gap-2">
                <Button onclick={reset}>Try again</Button>
                <Button href="/" variant="outline">Go home</Button>
            </div>
            <p class="text-muted-foreground text-xs">
                Still stuck? Email
                <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
            </p>
            {#if import.meta.env.DEV}
                <!-- Bounded and scrollable. A Svelte render error carries a hundred-odd frames through
                     the runtime, and unbounded they pushed Try again and the contact address off the
                     top of the screen — the two things the page exists to offer. max-h keeps the
                     controls reachable; the message is first, so it is what you land on. -->
                <pre
                    class="text-destructive bg-muted max-h-64 w-full max-w-3xl overflow-auto rounded-lg border p-4 text-left font-mono text-xs whitespace-pre-wrap">{formatError(
                        error,
                    )}</pre>
            {/if}
        </div>
    {/snippet}
</svelte:boundary>
