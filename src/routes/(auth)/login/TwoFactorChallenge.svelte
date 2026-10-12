<script lang="ts">
import { authClient } from '$lib/auth-client'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'

/* The second sign-in step for an account with 2FA on. The password step left a short-lived
   two-factor cookie and NO session; one of these calls exchanges it for the session. Better Auth
   allows 5 tries per challenge, then the password step must be repeated. */
let { onVerified }: { onVerified: () => void } = $props()

let useBackupCode = $state(false)
let codeInput = $state('')
let loading = $state(false)
let error = $state('')

async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    error = ''
    const code = codeInput.trim()
    const result = useBackupCode
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code })
    loading = false
    if (result.error) {
        error = result.error.message ?? 'That code did not match.'
        return
    }
    onVerified()
}

function handleToggleBackupCode() {
    useBackupCode = !useBackupCode
    codeInput = ''
    error = ''
}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
    <label for="code" class="text-sm font-medium">
        {useBackupCode ? 'Backup code' : 'Code from your authenticator app'}
    </label>
    {#if useBackupCode}
        <Input id="code" autocomplete="off" bind:value={codeInput} required />
    {:else}
        <Input
            id="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]*"
            maxlength={6}
            bind:value={codeInput}
            required />
    {/if}
    {#if error}
        <p class="text-destructive text-sm">{error}</p>
    {/if}
    <Button type="submit" class="w-full" disabled={loading}>
        {loading ? 'Checking…' : 'Verify'}
    </Button>
    <Button type="button" variant="link" onclick={handleToggleBackupCode}>
        {useBackupCode ? 'Use the authenticator app instead' : 'Lost your phone? Use a backup code'}
    </Button>
</form>
