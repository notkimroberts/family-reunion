<script lang="ts">
import { TriangleAlert } from '@lucide/svelte'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { flattenFormErrors } from './flattenFormErrors'

/* Shows every validation problem on the form, not just the handful of fields that happen to render
   their own error. Without this, a failure on any unrendered field — or a form-level message — is
   completely silent, and three separate bugs presented identically as "clicking does nothing". */
let {
    errors,
    message,
}: {
    errors: unknown
    message?: string
} = $props()

let problems = $derived(flattenFormErrors(errors))
</script>

{#if problems.length > 0 || message}
    <Alert variant="destructive">
        <TriangleAlert class="size-4" />
        <AlertTitle>
            {message ?? 'Please fix the following before continuing'}
        </AlertTitle>
        {#if problems.length > 0}
            <AlertDescription>
                <ul class="flex list-disc flex-col gap-1 pl-4">
                    {#each problems as problem (problem)}
                        <li>{problem}</li>
                    {/each}
                </ul>
            </AlertDescription>
        {/if}
    </Alert>
{/if}
