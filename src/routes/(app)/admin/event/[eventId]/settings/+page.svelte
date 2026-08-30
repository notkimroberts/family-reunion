<script lang="ts">
import { ArrowLeft, CalendarCog, Lock, Plus, Tags, ToggleRight, Trash2 } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import { Textarea } from '$lib/components/ui/textarea'
import { EVENT_STATUS_ORDER, EVENT_STATUS_STYLES } from '$lib/general/constants/EVENT_STATUS_STYLES'
import { cn, formatPrice } from '$lib/utils'

/* Setup's event editor: set once a year, then left alone. Quiet on purpose.

   The Event details card is ONE form, however many subheadings it carries. ?/update_event writes the
   dates and the whole metadata object in a single db.update and clears anything the POST omits, so
   promoting a subheading to its own card with its own Save would erase whatever that Save did not
   carry. Group with subheadings; never with a second form. ?/update_lock_date has the same shape.

   `form` is the only channel for the fail()s these actions raise. The page rendered no form prop at
   all, so a rejected price or lock date arrived and vanished — Save looked like it did nothing. */

let { data, form } = $props()

const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold uppercase tracking-wide'

/* Every key the program page reads, shown once, so the owner has something to copy rather than a
   shape they have to reconstruct from what happens to be saved. Kept in step with
   $lib/general/reunionMetadata — the parser is strict(), so a key that is not here is refused. */
const METADATA_EXAMPLE = `{
  "venue": {
    "name": "Oakstop",
    "address": "1721 Broadway, Oakland, CA 94612",
    "description": "Event space in Uptown Oakland."
  },
  "menu": ["BBQ ribs", "Mac and cheese"],
  "drinks": ["Sweet tea", "Lemonade"],
  "sites": [{ "name": "Lake Merritt", "description": "A short walk away." }],
  "activities": [{ "name": "Family photo", "description": "Saturday, 2pm." }],
  "schedule": [{ "day": "Saturday", "time": "9:00 AM", "activity": "Breakfast" }]
}`

/* Labels, icons and colours come from EVENT_STATUS_STYLES, shared with the /admin year cards so the
   same status cannot look like two different things on two screens. EVENT_STATUS_ORDER is the life of a
   year — draft, open, closed, archived — rather than the enum's order. */

/* Native select, not a bits-ui one: this drives shirt sizing through a plain POST, and bits-ui's Select
   binds a string | string[] union that breaks SSR here. Sized to match Input beside it. */
const SHIRT_SELECT_CLASS =
    'h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs md:text-sm'
</script>

<svelte:head>
    <title>Edit {data.event.title} — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-3 xl:col-span-8">
    <nav aria-label="Breadcrumb" class="text-muted-foreground flex items-center gap-2 text-sm">
        <a href="/admin" class="transition-colors hover:text-foreground">Reunions</a>
        <span aria-hidden="true">/</span>
        <a
            href="/admin/event/{data.event.id}/registrations"
            class="transition-colors hover:text-foreground">
            {data.event.year}
        </a>
        <span aria-hidden="true">/</span>
        <span class="text-foreground">Settings</span>
    </nav>

    <!-- No Add paper registration here. Entering a form is working with the list, and the list is one
         click away; a settings page offering it put a daily action on a page visited twice a year. -->
    <div class="flex flex-col gap-1">
        <h1>{data.event.title}</h1>
        <div class="flex flex-wrap items-center gap-2">
            <p class="text-muted-foreground text-sm">Reunion year {data.event.year}</p>
            <!-- Same palette as the card below and as /admin, rather than an outline badge printing the
                 raw database word in lower case. -->
            <Badge variant="outline" class={EVENT_STATUS_STYLES[data.event.status].class}>
                {EVENT_STATUS_STYLES[data.event.status].label}
            </Badge>
        </div>
    </div>
</section>

<!-- Above every card, not between two of them. Five actions on this page fail() with this one key —
     including the status switch, whose 23505 "another year is already open" is the most likely of them —
     and an alert sitting after the control that raised it reads as a comment on the next card down. -->
{#if form?.error}
    <section class="col-span-12 xl:col-span-8">
        <Alert variant="destructive">
            <AlertDescription>{form.error}</AlertDescription>
        </Alert>
    </section>
{/if}

<!-- The two switches that decide whether anyone can register, side by side at the top because they
     answer one question together: is this year open, and until when. Reading them apart — with the
     venue, the menu and the whole tier table between them — meant checking one and scrolling for the
     other.

     Both fit the 8-column measure at half width: each holds one control and a sentence. The rest of the
     page stays full-measure because it holds forms with paired fields and a tier table. -->
<section class="col-span-12 grid grid-cols-1 gap-6 xl:col-span-8 md:grid-cols-2">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <ToggleRight class="text-muted-foreground size-4" />
                Registration status
            </CardTitle>
            <CardDescription>
                Only <strong>open</strong> lets anyone register. One year can be open at a time.
            </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            <!-- The current state stated first, and loudly. This was an outline Badge printing the raw
                 database word, which made the most consequential fact on the page — whether the public
                 can register at all — the quietest thing on it. Same palette and icons as the /admin
                 year cards, so a year recognised there reads the same here. -->
            {@const current = EVENT_STATUS_STYLES[data.event.status]}
            {@const CurrentIcon = current.icon}
            <div class={cn('flex items-start gap-3 rounded-lg border px-4 py-3', current.class)}>
                <CurrentIcon class="mt-0.5 size-5 shrink-0" />
                <div class="flex flex-col gap-0.5">
                    <p class="text-sm font-semibold">{current.headline}</p>
                    <p class="text-sm">{current.note}</p>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <p class={SUBHEAD_CLASS}>Change to</p>
                <!-- One button per status rather than a select and a Save: nothing is half-changed and
                     left unsaved. The current one is omitted rather than disabled — it is already
                     stated above, and a disabled copy of it only invites a click that does nothing. -->
                <div class="flex flex-wrap gap-2">
                    {#each EVENT_STATUS_ORDER.filter((s) => s !== data.event.status) as status (status)}
                        {@const style = EVENT_STATUS_STYLES[status]}
                        {@const Icon = style.icon}
                        <form method="POST" action="?/update_status" use:enhance>
                            <input type="hidden" name="status" value={status} />
                            <Button type="submit" size="sm" variant="outline" class={style.tone}>
                                <Icon class="size-4" />
                                {style.label}
                            </Button>
                        </form>
                    {/each}
                </div>
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Lock class="text-muted-foreground size-4" />
                Registration lock date
            </CardTitle>
            <CardDescription>
                Once this date passes, registrants can no longer edit details, add or remove
                members, or cancel — the registration is fully frozen. Leave it blank for no lock.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form
                method="POST"
                action="?/update_lock_date"
                use:enhance
                class="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto] sm:items-end">
                <Field.Field class="gap-2">
                    <Field.Label for="registrationLockDate">Lock date</Field.Label>
                    <Input
                        id="registrationLockDate"
                        name="registrationLockDate"
                        type="datetime-local"
                        value={data.event.registrationLockDate
                            ? new Date(data.event.registrationLockDate).toISOString().slice(0, 16)
                            : ''} />
                </Field.Field>
                <Button type="submit" size="sm" variant="secondary" class="w-full sm:w-auto">
                    Save lock date
                </Button>
            </form>
        </CardContent>
    </Card>
</section>

<section class="col-span-12 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <CalendarCog class="text-muted-foreground size-4" />
                Event details
            </CardTitle>
            <CardDescription>
                The dates, and everything the program page shows. One Save writes all of it, and a
                field left blank is cleared.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/update_event" use:enhance class="flex flex-col gap-6">
                <div class="flex flex-col gap-3">
                    <p class={SUBHEAD_CLASS}>When</p>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field.Field class="gap-2">
                            <Field.Label for="startDate">Start</Field.Label>
                            <Input
                                id="startDate"
                                name="startDate"
                                type="datetime-local"
                                value={data.event.startDate
                                    ? new Date(data.event.startDate).toISOString().slice(0, 16)
                                    : ''} />
                        </Field.Field>
                        <Field.Field class="gap-2">
                            <Field.Label for="endDate">End</Field.Label>
                            <Input
                                id="endDate"
                                name="endDate"
                                type="datetime-local"
                                value={data.event.endDate
                                    ? new Date(data.event.endDate).toISOString().slice(0, 16)
                                    : ''} />
                        </Field.Field>
                    </div>
                </div>

                <Separator />

                <div class="flex flex-col gap-3">
                    <p class={SUBHEAD_CLASS}>Program content</p>
                    <p class="text-muted-foreground text-sm">
                        Venue, food and the schedule, as one JSON object. Anything that does not
                        parse — or uses a key that is not in the example — is rejected with a
                        message and <strong>nothing on this card is saved</strong>, so a bad paste
                        can never blank the program page. Every key is optional.
                    </p>
                    <Field.Field class="gap-2">
                        <Field.Label for="metadata">Event details JSON</Field.Label>
                        <!-- form?.metadata is the text that was just rejected. Falling back to it
                             first means a failed Save returns the owner's own paste to them, with
                             the error above it, rather than silently reverting to what is stored. -->
                        <Textarea
                            id="metadata"
                            name="metadata"
                            class="min-h-96 font-mono text-xs"
                            value={form?.metadata ??
                                JSON.stringify(data.event.metadata, null, 2)} />
                        <Field.Description>
                            <pre
                                class="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">{METADATA_EXAMPLE}</pre>
                        </Field.Description>
                    </Field.Field>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <Button type="submit" variant="secondary">Save event details</Button>
                    <p class="text-muted-foreground text-xs">Writes every field in this card.</p>
                </div>
            </form>
        </CardContent>
    </Card>
</section>

<!-- The Setup landing links to #tiers, and this anchor is NEW — before the restructure that link went
     nowhere. It is load-bearing now, so do not rename it. -->
<section id="tiers" class="col-span-12 scroll-mt-6 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Tags class="text-muted-foreground size-4" />
                Tiers & prices
            </CardTitle>
            <CardDescription>
                What each kind of attendee pays, in dollars. Party members keep the label and price
                they were charged, so renaming or repricing a tier never changes a registration that
                already exists.
            </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            {#if data.tiers.length === 0}
                <p class="text-muted-foreground text-sm">
                    No tiers yet — the register form has nothing to offer until there is one.
                </p>
            {/if}

            {#each data.tiers as tier (tier.id)}
                <!-- Two sibling forms share one five-track grid: display:contents on the update form
                     lifts its own children into that grid, so Save lands in track four and Delete in
                     track five. Drop it and the whole row collapses into a single cell. -->
                <div
                    class="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
                    <form method="POST" action="?/update_tier" use:enhance class="contents">
                        <input type="hidden" name="tierId" value={tier.id} />
                        <Field.Field class="gap-2">
                            <Field.Label for="tier-label-{tier.id}">Label</Field.Label>
                            <Input
                                id="tier-label-{tier.id}"
                                name="label"
                                type="text"
                                value={tier.label}
                                required />
                        </Field.Field>
                        <Field.Field class="gap-2">
                            <!-- Dollars, not cents — the action multiplies by 100 on the way in. -->
                            <Field.Label for="tier-price-{tier.id}">Price ($)</Field.Label>
                            <Input
                                id="tier-price-{tier.id}"
                                name="priceCents"
                                type="number"
                                step="0.01"
                                value={formatPrice(tier.priceCents)}
                                required />
                        </Field.Field>
                        <Field.Field class="gap-2">
                            <Field.Label for="tier-shirt-{tier.id}">Shirt sizing</Field.Label>
                            <select
                                id="tier-shirt-{tier.id}"
                                name="shirtSizeCategory"
                                value={tier.shirtSizeCategory}
                                class={SHIRT_SELECT_CLASS}>
                                <option value="adult">Adult</option>
                                <option value="child">Child</option>
                            </select>
                        </Field.Field>
                        <Button
                            type="submit"
                            size="sm"
                            variant="secondary"
                            class="w-full sm:w-auto">
                            Save
                        </Button>
                    </form>
                    <form method="POST" action="?/delete_tier" use:enhance>
                        <input type="hidden" name="tierId" value={tier.id} />
                        <!-- Left narrow on purpose: stacked at 375px this sits directly under Save,
                             and there is no confirmation behind it. -->
                        <Button type="submit" size="sm" variant="ghost" class="text-destructive">
                            <Trash2 class="size-4" />
                            Delete
                        </Button>
                    </form>
                </div>
            {/each}

            <Separator />

            <div class="flex flex-col gap-3">
                <p class={SUBHEAD_CLASS}>Add a tier</p>
                <form
                    method="POST"
                    action="?/add_tier"
                    use:enhance
                    class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                    <Field.Field class="gap-2">
                        <Field.Label for="new-tier-label">Label</Field.Label>
                        <Input id="new-tier-label" name="label" type="text" required />
                    </Field.Field>
                    <Field.Field class="gap-2">
                        <Field.Label for="new-tier-price">Price ($)</Field.Label>
                        <Input
                            id="new-tier-price"
                            name="priceCents"
                            type="number"
                            step="0.01"
                            required />
                    </Field.Field>
                    <Field.Field class="gap-2">
                        <Field.Label for="new-tier-shirt">Shirt sizing</Field.Label>
                        <select
                            id="new-tier-shirt"
                            name="shirtSizeCategory"
                            class={SHIRT_SELECT_CLASS}>
                            <option value="adult">Adult</option>
                            <option value="child">Child</option>
                        </select>
                    </Field.Field>
                    <Button type="submit" size="sm" variant="secondary" class="w-full sm:w-auto">
                        <Plus class="size-4" />
                        Add tier
                    </Button>
                </form>
            </div>
        </CardContent>
    </Card>
</section>

<section class="col-span-12">
    <!-- The way back. With no admin header and no Setup area, the breadcrumb and this are the only
         routes out of here. -->
    <Button href="/admin/event/{data.event.id}/registrations" variant="ghost" size="sm">
        <ArrowLeft class="size-4" />
        Back to registrations
    </Button>
</section>
