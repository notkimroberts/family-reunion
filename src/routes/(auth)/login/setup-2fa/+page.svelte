<script lang="ts">
import { goto } from '$app/navigation'
import { authClient } from '$lib/auth-client'
import { QrCode } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { APP_NAME } from '$lib/general/constants'
import type { PageProps } from './$types'

type Step = 'password' | 'scan' | 'codes'

let { data }: PageProps = $props()

let step = $state<Step>('password')
let passwordInput = $state('')
let codeInput = $state('')
let totpUri = $state('')
let backupCodes = $state<string[]>([])
let savedCodes = $state(false)
let loading = $state(false)
let error = $state('')

let secret = $derived(totpUri ? (new URL(totpUri).searchParams.get('secret') ?? '') : '')

/* Step 1: the password again, which twoFactor.enable requires. Returns the secret and the backup
   codes, but 2FA is not on until a code from the app is verified. */
async function handleEnable(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    error = ''
    const result = await authClient.twoFactor.enable({ password: passwordInput })
    loading = false
    if (result.error || result.data?.method !== 'totp') {
        error = result.error?.message ?? 'Could not start setup. Check your password.'
        return
    }
    totpUri = result.data.totpURI
    backupCodes = result.data.backupCodes
    passwordInput = ''
    step = 'scan'
}

/* Step 2: the first code turns 2FA on. Better Auth replaces the session cookie in this response,
   so the next request already carries twoFactorEnabled and the 5-minute cookie cache cannot hold
   the old value. */
async function handleVerify(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    error = ''
    const result = await authClient.twoFactor.verifyTotp({ code: codeInput.trim() })
    loading = false
    if (result.error) {
        error = result.error.message ?? 'That code did not match. Try the newest one.'
        return
    }
    step = 'codes'
}

function handleContinue() {
    goto('/admin')
}
</script>

<svelte:head>
    <title>Set up two-step sign-in — {APP_NAME}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-md shadow-xl">
        <CardContent class="flex flex-col gap-6 p-8">
            <div class="flex flex-col gap-1">
                <h1>Set up two-step sign-in</h1>
                <p class="text-muted-foreground text-sm">
                    Signed in as {data.email}. Every admin account needs an authenticator app, such
                    as Google Authenticator, Microsoft Authenticator or 1Password. You set this up
                    once.
                </p>
            </div>

            {#if step === 'password'}
                <form onsubmit={handleEnable} class="flex flex-col gap-3">
                    <label for="password" class="text-sm font-medium">Confirm your password</label>
                    <Input
                        id="password"
                        type="password"
                        bind:value={passwordInput}
                        autocomplete="current-password"
                        required />
                    {#if error}
                        <p class="text-destructive text-sm">{error}</p>
                    {/if}
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Checking…' : 'Continue'}
                    </Button>
                </form>
            {:else if step === 'scan'}
                <form onsubmit={handleVerify} class="flex flex-col gap-4">
                    <p class="text-sm">
                        1. In your authenticator app, add an account and scan this code.
                    </p>
                    <QrCode
                        value={totpUri}
                        label="QR code for your authenticator app"
                        class="self-center" />
                    <p class="text-muted-foreground text-sm">
                        Cannot scan? Enter this key instead:
                        <code class="bg-muted rounded px-1 font-mono break-all">{secret}</code>
                    </p>
                    <label for="code" class="text-sm"
                        >2. Enter the 6-digit code the app shows.</label>
                    <Input
                        id="code"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        pattern="[0-9]*"
                        maxlength={6}
                        bind:value={codeInput}
                        required />
                    {#if error}
                        <p class="text-destructive text-sm">{error}</p>
                    {/if}
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Checking…' : 'Turn on two-step sign-in'}
                    </Button>
                </form>
            {:else}
                <div class="flex flex-col gap-4">
                    <p class="text-sm">
                        Two-step sign-in is on. Save these backup codes somewhere safe, such as a
                        password manager. Each one works once, if you lose your phone.
                    </p>
                    <ul
                        class="bg-muted grid grid-cols-1 gap-1 rounded-lg p-4 font-mono text-sm md:grid-cols-2">
                        {#each backupCodes as code (code)}
                            <li>{code}</li>
                        {/each}
                    </ul>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" bind:checked={savedCodes} />
                        I have saved my backup codes
                    </label>
                    <Button disabled={!savedCodes} onclick={handleContinue}
                        >Continue to admin</Button>
                </div>
            {/if}
        </CardContent>
    </Card>
</div>
