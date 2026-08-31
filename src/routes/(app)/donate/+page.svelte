<script lang="ts">
import { HeartHandshake, LoaderCircle } from '@lucide/svelte'
import { superForm } from 'sveltekit-superforms'
import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'
import { page } from '$app/state'
import { DonationAmountPicker, DonationRaisedTotal } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'
import { APP_NAME, DONATION_LEDE } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import { donationSchema } from './schema'

let { data } = $props()

/* dataType 'form', not 'json': every field here is a real input, so the ordinary FormData post is
   enough. The registration form needs 'json' because it carries nested objects and an array that
   no DOM field mirrors — this one has neither. */
const { form, errors, submitting, enhance } = superForm(data.form, {
    validators: zodClient(donationSchema),
    dataType: 'form',
})

let cancelled = $derived(page.url.searchParams.get('cancelled') === 'true')
let heading = $derived(data.event ? `Support ${data.event.title}` : 'Support the reunion')
</script>

<svelte:head>
    <title>Donate — {APP_NAME}</title>
    <meta name="description" content="Give to the family reunion" />
</svelte:head>

<section class="col-span-12 mx-auto w-full max-w-2xl">
    <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <span
            class="bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase">
            <HeartHandshake class="text-primary h-3 w-3" />
            Donate
        </span>
        <h1 class="text-3xl font-bold tracking-tight md:text-4xl">{heading}</h1>
        <p class="text-muted-foreground max-w-prose text-sm">{DONATION_LEDE}</p>
        <DonationRaisedTotal
            totalCents={data.raised.totalCents}
            giftCount={data.raised.giftCount} />
    </div>

    {#if cancelled}
        <div class="bg-card mb-4 rounded-md border px-4 py-3 text-sm">
            Your checkout was cancelled and nothing was charged. You are welcome to try again.
        </div>
    {/if}

    <Card>
        <CardHeader class="pb-3">
            <CardTitle>Your gift</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/donate" use:enhance class="flex flex-col gap-5">
                <DonationAmountPicker
                    bind:value={$form.amountCents}
                    error={$errors.amountCents?.[0]}
                    idPrefix="donate" />
                <!-- The picker is not an input, so this is what carries the amount in the post. It
                     is the only mirrored field on the page and it has exactly one writer. -->
                <input type="hidden" name="amountCents" value={$form.amountCents} />

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-1.5">
                        <label for="donorName" class="text-sm font-medium">Your name</label>
                        <Input
                            id="donorName"
                            name="donorName"
                            bind:value={$form.donorName}
                            autocomplete="name"
                            required />
                        {#if $errors.donorName?.[0]}
                            <p class="text-destructive text-sm">{$errors.donorName[0]}</p>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="donorEmail" class="text-sm font-medium">Email</label>
                        <Input
                            id="donorEmail"
                            name="donorEmail"
                            type="email"
                            bind:value={$form.donorEmail}
                            placeholder="you@example.com"
                            autocomplete="email"
                            required />
                        {#if $errors.donorEmail?.[0]}
                            <p class="text-destructive text-sm">{$errors.donorEmail[0]}</p>
                        {/if}
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="message" class="text-sm font-medium">
                        Message <span class="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Textarea
                        id="message"
                        name="message"
                        rows={3}
                        bind:value={$form.message}
                        placeholder="In memory of…" />
                    {#if $errors.message?.[0]}
                        <p class="text-destructive text-sm">{$errors.message[0]}</p>
                    {/if}
                </div>

                <Button type="submit" class="w-full" disabled={$submitting}>
                    {#if $submitting}
                        <LoaderCircle class="size-4 animate-spin" />
                        Redirecting to checkout…
                    {:else if $form.amountCents > 0}
                        Give ${formatPrice($form.amountCents)}
                    {:else}
                        Continue to checkout
                    {/if}
                </Button>
                <p class="text-muted-foreground text-center text-xs">
                    You'll be redirected to a secure checkout. A gift to a family reunion is not
                    tax-deductible.
                </p>
            </form>
        </CardContent>
    </Card>

    <p class="text-muted-foreground mt-3 text-center text-xs">
        Coming to the reunion? <a class="underline" href="/register">Register here</a> — you can add a
        gift on the way through.
    </p>
</section>
