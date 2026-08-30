<script lang="ts">
import { CheckCircle2, KeyRound, LoaderCircle } from '@lucide/svelte'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import RegistrationManager from '../RegistrationManager.svelte'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30000

let { data } = $props()

/* The registration's status, re-read whenever the load re-runs.

   This was `$state(untrack(() => …))`, which copied the status ONCE at mount and never looked at
   `data` again. Cancelling redirects back to this route, and the load did re-run with the status now
   'refunded' — but the copy still said 'paid', so the "Registration cancelled" branch below never
   rendered. The page kept showing "You're registered!" with the confirmation dialog sitting on top
   of it, and only a hard refresh (a fresh mount, hence a fresh copy) told the truth. Nothing ever
   assigned to it, so there was no reason for it to be $state. */
let status = $derived(data.missingToken ? null : data.registration.status)
let timedOut = $state(false)

/* A 'pending' registration means two very different things. From the public flow it means a
   Stripe payment is settling and the webhook is about to flip it — worth polling for. From
   admin paper entry there is no Stripe session and no webhook will ever arrive, so polling
   would spin for 30s and then promise a confirmation email that never comes, leaving the
   registrant unable to see their own party. stripeSessionId is what distinguishes them. */
let awaitingStripe = $derived(
    !data.missingToken && status === 'pending' && data.registration.stripeSessionId !== null,
)
let paymentOwed = $derived(
    !data.missingToken && status === 'pending' && data.registration.stripeSessionId === null,
)

onMount(() => {
    if (!data.missingToken && data.memberAdded) {
        toast.success('Member added successfully!')
    }
})

$effect(() => {
    if (!awaitingStripe) {
        return
    }

    const start = Date.now()
    const interval = setInterval(async () => {
        if (Date.now() - start > POLL_TIMEOUT_MS) {
            timedOut = true
            clearInterval(interval)
            return
        }

        /* Token is read from the reg_token cookie server-side; no token query param needed. */
        const res = await fetch(`/api/registration/status`)
        if (res.ok) {
            const body = await res.json()
            if (body.status !== 'pending') {
                clearInterval(interval)
                window.location.reload()
            }
        }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
})
</script>

<svelte:head>
    <title>Manage Registration — {APP_NAME}</title>
</svelte:head>

{#if data.missingToken}
    <section class="col-span-12 max-w-md mx-auto w-full">
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <KeyRound class="h-5 w-5 text-muted-foreground" />
                    Find your registration
                </CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
                <p class="text-sm text-muted-foreground">
                    We couldn't find an active registration session in this browser. If you've
                    already registered, we can email a fresh management link to you.
                </p>
                <div class="flex flex-col gap-2">
                    <Button href="/register/recover">Resend management link</Button>
                    <Button href="/register" variant="outline">Start a new registration</Button>
                </div>
            </CardContent>
        </Card>
    </section>
{:else if awaitingStripe && !timedOut}
    <section class="col-span-12 text-center py-12">
        <LoaderCircle class="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
        <p class="text-lg font-semibold">Processing Payment…</p>
        <p class="text-muted-foreground mt-1 text-sm">Hang tight, we're confirming your payment.</p>
    </section>
{:else if awaitingStripe && timedOut}
    <section class="col-span-12 text-center py-12">
        <p class="text-lg font-semibold">Payment Is Processing</p>
        <p class="text-muted-foreground mt-2 text-sm">
            This is taking longer than expected. You'll receive a confirmation email once your
            payment is confirmed.
        </p>
    </section>
    <section class="col-span-12 flex justify-center">
        <Button href="/">Go Home</Button>
    </section>
{:else if status === 'refunded'}
    <section class="col-span-12">
        <Alert class="mb-4" variant="destructive">
            <AlertTitle>Registration cancelled</AlertTitle>
            <AlertDescription>
                This registration has been cancelled and a refund has been issued. To register
                again, head back to the registration form.
            </AlertDescription>
        </Alert>
    </section>
    <section class="col-span-12 flex justify-center">
        <Button href="/register">Register again</Button>
    </section>
{:else}
    <!-- Success header on first paid view -->
    <section class="col-span-12 text-center">
        <CheckCircle2 class="mx-auto mb-4 h-14 w-14 text-green-500" />
        <h1 class="text-2xl font-bold">You're registered!</h1>
        <p class="text-muted-foreground mt-2">
            See you at <span class="font-medium text-foreground">{data.event.title}</span>!
        </p>
        <p class="text-sm text-muted-foreground mt-1">
            Bookmark this page or keep the email — it's how you'll come back to manage your
            registration.
        </p>
    </section>

    {#if paymentOwed}
        <!-- Admin-entered registration with payment still outstanding. No Stripe session
             exists, so there is nothing to poll for; say what is owed and let them manage
             their party in the meantime. -->
        <section class="col-span-12">
            <Alert>
                <AlertTitle>Payment outstanding</AlertTitle>
                <AlertDescription>
                    Your place is recorded but payment hasn't been received yet. Contact
                    <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
                    or call <a class="underline" href="sms:{CONTACT_PHONE}">{CONTACT_PHONE}</a>
                    to arrange it.
                </AlertDescription>
            </Alert>
        </section>
    {/if}

    <RegistrationManager
        token={data.token}
        registration={data.registration}
        members={data.members}
        event={data.event}
        tiers={data.tiers} />
{/if}
