<script lang="ts">
import { ArrowLeft } from '@lucide/svelte'
import { goto } from '$app/navigation'
import { authClient } from '$lib/auth-client'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { APP_NAME } from '$lib/general/constants'

let emailInput = $state('')
let passwordInput = $state('')
let loading = $state(false)
let error = $state('')

async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const email = emailInput.trim()
    const password = passwordInput
    if (!email || !password) {
        return
    }
    loading = true
    error = ''
    const result = await authClient.signIn.email({ email, password })
    loading = false
    if (result.error) {
        error = result.error.message ?? 'Invalid email or password.'
        return
    }
    goto('/admin')
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
                        <div>
                            <h1>Sign in to {APP_NAME}</h1>
                            <p class="text-muted-foreground mt-1 text-sm">
                                Admin access only. Family members don't need an account to register
                                for the reunion.
                            </p>
                        </div>

                        <form onsubmit={handleSubmit} class="space-y-3">
                            <div class="space-y-2">
                                <label for="email" class="text-sm font-medium">Email</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    bind:value={emailInput}
                                    autocomplete="email"
                                    required />
                            </div>
                            <div class="space-y-2">
                                <label for="password" class="text-sm font-medium">Password</label>
                                <Input
                                    id="password"
                                    type="password"
                                    bind:value={passwordInput}
                                    autocomplete="current-password"
                                    required />
                            </div>
                            {#if error}
                                <p class="text-destructive text-sm">{error}</p>
                            {/if}
                            <Button type="submit" class="w-full" disabled={loading}>
                                {loading ? 'Signing in…' : 'Sign in'}
                            </Button>
                        </form>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</div>
