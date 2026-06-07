<script lang="ts">
import { Mail } from '@lucide/svelte'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { APP_NAME } from '$lib/general/constants'
import { recoverSchema } from './schema'

let { data } = $props()

let sent = $state(false)

const { form, errors, enhance } = superForm(data.form, {
    validators: zodClient(recoverSchema),
    dataType: 'form',
    onUpdated: ({ form }) => {
        if (form.valid) {
            sent = true
        }
    },
})
</script>

<svelte:head>
    <title>Recover Registration — {APP_NAME}</title>
</svelte:head>

<section class="col-span-12 max-w-md mx-auto w-full">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Mail class="h-5 w-5 text-muted-foreground" />
                Resend management link
            </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            {#if sent}
                <p class="text-sm">
                    If we found a registration for that email, we've sent a fresh management link.
                    Check your inbox.
                </p>
                <Button variant="outline" href="/">Back to home</Button>
            {:else}
                <p class="text-sm text-muted-foreground">
                    Enter the email you used to register and we'll re-send the link to manage your
                    party.
                </p>
                <form method="POST" use:enhance class="space-y-3">
                    <div class="space-y-1.5">
                        <label for="email" class="text-sm font-medium">Email</label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            bind:value={$form.email}
                            placeholder="you@example.com"
                            autocomplete="email"
                            required />
                        {#if $errors.email?.[0]}
                            <p class="text-sm text-destructive">{$errors.email[0]}</p>
                        {/if}
                    </div>
                    <Button type="submit" class="w-full">Send management link</Button>
                </form>
            {/if}
        </CardContent>
    </Card>
</section>
