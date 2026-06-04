<script lang="ts">
import { ArrowLeft, Mail } from '@lucide/svelte'
import { authClient } from '$lib/auth-client'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { APP_NAME } from '$lib/general/constants'

let emailInput = $state('')
let emailSent = $state(false)
let emailSentTo = $state('')
let loading = $state(false)
let error = $state('')

async function handleEmailSubmit(e: SubmitEvent) {
    e.preventDefault()
    const email = emailInput.trim()
    if (!email) {
        return
    }
    loading = true
    error = ''
    const result = await authClient.signIn.magicLink({ email, callbackURL: '/register' })
    loading = false
    if (result.error) {
        error = result.error.message ?? 'Something went wrong. Please try again.'
    } else {
        emailSentTo = email
        emailSent = true
    }
}
</script>

<svelte:head>
    <title>Sign In — {APP_NAME}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
    <div class="w-full max-w-sm lg:max-w-4xl">
        <div class="mb-6 flex justify-center">
            <Button href="/" variant="outline" class="gap-2">
                <ArrowLeft class="h-4 w-4" />
                {APP_NAME}
            </Button>
        </div>
        <Card class="overflow-hidden shadow-xl">
            <CardContent class="p-0">
                <div class="grid lg:grid-cols-2">
                    <figure class="bg-muted pointer-events-none max-lg:hidden">
                        <img
                            src="/will_and_roxie.png"
                            alt="Will and Roxie"
                            class="h-full w-full object-cover" />
                    </figure>

                    <div class="flex flex-col justify-center gap-6 px-10 py-12 lg:px-16">
                        {#if emailSent}
                            <div class="space-y-3 text-center">
                                <div class="flex justify-center">
                                    <div
                                        class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                        <Mail class="h-7 w-7 text-primary" />
                                    </div>
                                </div>
                                <h1>Check your email</h1>
                                <p class="text-sm text-muted-foreground">
                                    We sent a sign-in link to<br />
                                    <span class="font-medium text-foreground">{emailSentTo}</span>
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    The link expires in 5 minutes. Check your spam folder if you
                                    don't see it.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                class="w-full text-sm"
                                onclick={() => {
                                    emailSent = false
                                    emailInput = ''
                                }}>
                                Use a different email
                            </Button>
                        {:else}
                            <div>
                                <h1>Sign in to {APP_NAME}</h1>
                                <p class="mt-1 text-sm text-muted-foreground">
                                    Enter your email and we'll send you a sign-in link.
                                </p>
                            </div>

                            <form onsubmit={handleEmailSubmit} class="space-y-3">
                                <div class="space-y-2">
                                    <label for="email" class="text-sm font-medium">
                                        Email address
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        bind:value={emailInput}
                                        autocomplete="email"
                                        required />
                                </div>
                                {#if error}
                                    <p class="text-sm text-destructive">{error}</p>
                                {/if}
                                <Button type="submit" class="w-full gap-2" disabled={loading}>
                                    <Mail class="h-4 w-4" />
                                    {loading ? 'Sending…' : 'Send sign-in link'}
                                </Button>
                            </form>
                        {/if}
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</div>
