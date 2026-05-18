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

function signInWithGoogle() {
    authClient.signIn.social({ provider: 'google', callbackURL: '/register' })
}

function signInWithApple() {
    authClient.signIn.social({ provider: 'apple', callbackURL: '/register' })
}

function signInWithFacebook() {
    authClient.signIn.social({ provider: 'facebook', callbackURL: '/register' })
}

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
                            <div class="text-center space-y-3">
                                <div class="flex justify-center">
                                    <div
                                        class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                        <Mail class="h-7 w-7 text-primary" />
                                    </div>
                                </div>
                                <h1 class="text-2xl font-bold">Check your email</h1>
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
                                <h1 class="text-2xl font-bold">Sign in to {APP_NAME}</h1>
                                <p class="mt-1 text-sm text-muted-foreground">
                                    New or returning — just pick your account to get started.
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

                            <div class="relative">
                                <div class="absolute inset-0 flex items-center">
                                    <span class="w-full border-t"></span>
                                </div>
                                <div
                                    class="relative flex justify-center text-xs uppercase text-muted-foreground">
                                    <span class="bg-card px-2">or continue with</span>
                                </div>
                            </div>

                            <div class="flex flex-col gap-3">
                                <Button variant="outline" class="gap-2" onclick={signInWithGoogle}>
                                    <svg class="h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </Button>

                                <Button variant="outline" class="gap-2" onclick={signInWithApple}>
                                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path
                                            d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                    </svg>
                                    Continue with Apple
                                </Button>

                                <Button
                                    variant="outline"
                                    class="gap-2"
                                    onclick={signInWithFacebook}>
                                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                                        <path
                                            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    Continue with Facebook
                                </Button>
                            </div>
                        {/if}
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</div>
