<script lang="ts">
import { page } from '$app/state'
import { Button } from '$lib/components/ui/button'
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { toE164 } from '$lib/utils'

const NOT_FOUND = 404
const FIRST_SERVER_ERROR = 500

/* At the root so it covers every route, including paths that match none — those never reach the
   (app) group's layout, so the header is not available here and the page carries its own way home.

   A 4xx message is one the app wrote for a person (error(403, 'Registration changes are closed…')),
   so it is shown. A 5xx message is SvelteKit's generic "Internal Error", which tells nobody anything;
   the error is already in Sentry via handleError. */
let isNotFound = $derived(page.status === NOT_FOUND)
let heading = $derived(isNotFound ? 'Page not found' : 'Something went wrong')
let detail = $derived.by(() => {
    if (isNotFound) {
        return 'We could not find that page. The link may be old or mistyped.'
    }
    if (page.status < FIRST_SERVER_ERROR && page.error?.message) {
        return page.error.message
    }
    return 'This page hit an unexpected error, and it has been reported. Trying again often clears it.'
})
</script>

<svelte:head>
    <title>{heading} — {APP_NAME}</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
    <p class="text-muted-foreground text-sm font-medium">{page.status}</p>
    <h1>{heading}</h1>
    <p class="text-muted-foreground max-w-md text-sm">{detail}</p>
    <div class="flex flex-wrap items-center justify-center gap-2">
        <Button href="/">Go to the home page</Button>
        <Button href="/register" variant="outline">Register</Button>
    </div>
    <p class="text-muted-foreground max-w-md text-sm">
        Need help? Email
        <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
        or text
        <a class="underline" href="sms:{toE164(CONTACT_PHONE)}">{CONTACT_PHONE}</a>.
    </p>
</div>
