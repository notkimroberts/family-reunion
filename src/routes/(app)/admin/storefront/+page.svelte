<script lang="ts">
import { CalendarDays, ChevronRight, ExternalLink } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'

/* Merchandise is one outbound link plus optional preview cards — set once a year and left alone.

   Both the load and the save re-query status='open', so this page can only ever edit the open year's
   shop. That was always true and never said out loud, so the copy says it. */

const PRODUCT_JSON_EXAMPLE =
    '[{ "name": "Reunion Tee", "imageUrl": "https://…/tee.jpg", "description": "Front and back print" }]'

let { data, form } = $props()

let productsJson = $derived(
    data.event?.shopProducts ? JSON.stringify(data.event.shopProducts, null, 2) : '',
)
</script>

<svelte:head>
    <title>Storefront — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-1 xl:col-span-8">
    <div class="text-muted-foreground flex items-center gap-2 text-sm">
        <a href="/admin/setup" class="transition-colors hover:text-foreground">Setup</a>
        <span>/</span>
        <span class="text-foreground font-medium">Storefront</span>
    </div>
    <h1>Storefront</h1>
    <p class="text-muted-foreground text-sm">
        The shop belongs to whichever reunion year is open for registration. Draft and closed years
        cannot be edited here, and saving checks again which year is open.
    </p>
</section>

{#if !data.event}
    <section class="col-span-12 flex flex-col gap-2 xl:col-span-8">
        <p class="text-muted-foreground text-sm">
            No year is open for registration, so there is no shop to edit yet.
        </p>
        <a
            href="/admin/setup/events"
            class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted">
            <CalendarDays class="text-muted-foreground size-4 shrink-0" />
            <div class="min-w-0 flex-1">
                <p class="text-sm font-medium">Reunion years</p>
                <p class="text-muted-foreground text-xs">Open a year, then come back here</p>
            </div>
            <ChevronRight class="text-muted-foreground size-4 shrink-0" />
        </a>
    </section>
{:else}
    <section class="col-span-12 xl:col-span-8">
        <Card>
            <CardHeader>
                <CardTitle>{data.event.title}</CardTitle>
                <CardDescription>{data.event.year} · open for registration</CardDescription>
            </CardHeader>
            <CardContent>
                <!-- Unnamed default action: no action attribute, and none is wanted. -->
                <form method="POST" use:enhance class="flex flex-col gap-6">
                    <Field.Group class="gap-5">
                        <Field.Field>
                            <Field.Label for="externalShopUrl">Shop link</Field.Label>
                            <Input
                                id="externalShopUrl"
                                name="externalShopUrl"
                                type="url"
                                value={data.event.externalShopUrl ?? ''}
                                placeholder="https://your-shop.com"
                                required />
                            <Field.Description>
                                Where the Shop Now button on the public page sends people. Required.
                            </Field.Description>
                        </Field.Field>

                        <Field.Field orientation="horizontal">
                            <Field.Content>
                                <Field.Label for="isActive">Show the shop page</Field.Label>
                                <Field.Description>
                                    With this off, visitors to /shop are told the shop is not
                                    available. The link above is kept either way.
                                </Field.Description>
                            </Field.Content>
                            <!-- Native checkbox on purpose: the server reads isActive === 'on', and only a
                                 real checkbox posts that. A Switch renders a <button>, posts nothing, and
                                 would leave the shop permanently hidden. -->
                            <input
                                id="isActive"
                                name="isActive"
                                type="checkbox"
                                class="size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                                checked={data.event.shopActive} />
                        </Field.Field>

                        <Field.Field>
                            <Field.Label for="products">Product previews</Field.Label>
                            <Textarea
                                id="products"
                                name="products"
                                class="min-h-40 font-mono text-xs"
                                spellcheck="false"
                                value={productsJson} />
                            <Field.Description>
                                Optional cards shown above the Shop Now button — a JSON array of
                                name, imageUrl and an optional description. Leave it empty for none.
                            </Field.Description>
                            <p class="text-muted-foreground font-mono text-xs">
                                {PRODUCT_JSON_EXAMPLE}
                            </p>
                        </Field.Field>
                    </Field.Group>

                    <div class="flex flex-wrap items-center gap-3">
                        <Button type="submit">Save</Button>
                        <!-- The only Setup page that shows a server error, so it sits next to the button
                             rather than at the top of the page. -->
                        <p class="text-sm" aria-live="polite">
                            {#if form?.error}
                                <span class="text-destructive">{form.error}</span>
                            {:else if form?.success}
                                <span class="text-muted-foreground">Saved</span>
                            {/if}
                        </p>
                        <a
                            href="/shop"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-muted-foreground ml-auto flex items-center gap-1.5 text-sm transition-colors hover:text-foreground">
                            <ExternalLink class="size-3.5 shrink-0" />
                            Open the shop page
                        </a>
                    </div>
                </form>
            </CardContent>
        </Card>
    </section>
{/if}
