<script lang="ts">
import { ArrowLeft, Braces, CalendarRange, Lock, Plus, Tags, ToggleRight, X } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { DateTimeField } from '$lib/components'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Badge } from '$lib/components/ui/badge'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'
import { Textarea } from '$lib/components/ui/textarea'
import { EVENT_STATUS_ORDER, EVENT_STATUS_STYLES } from '$lib/general/constants/EVENT_STATUS_STYLES'
import { cn, formatPrice, toReunionWallClock } from '$lib/utils'

/* Setup's event editor: set once a year, then left alone. Quiet on purpose.

   FOUR CARDS, four Saves, and each writes only its own columns. The dates and the program JSON used to
   share one card and one ?/update_event, which was not a layout choice — that action wrote both sets of
   columns in a single db.update and cleared anything the POST omitted, so a second Save on the same row
   would have blanked whatever it did not carry. Splitting the card therefore required splitting the
   action first; ?/update_dates and ?/update_program each set only their own fields.

   Dates now sit with Tiers, because those two are what an organiser revisits: when it is and what it
   costs. The JSON textarea is 96 lines tall and is edited once a year — pairing it with the dates meant
   scrolling past the whole program to reach a field you came to change.

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
</script>

<svelte:head>
    <title>Edit {data.event.title} — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-3 xl:col-span-8">
    <nav aria-label="Breadcrumb" class="text-muted-foreground flex items-center gap-2 text-sm">
        <a href="/admin" class="hover:text-foreground transition-colors">Reunions</a>
        <span aria-hidden="true">/</span>
        <a
            href="/admin/event/{data.event.id}/registrations"
            class="hover:text-foreground transition-colors">
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
<section class="col-span-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:col-span-8">
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
                class="flex flex-col items-start gap-3">
                <DateTimeField
                    id="registrationLockDate"
                    name="registrationLockDate"
                    label="Lock date"
                    value={toReunionWallClock(data.event.registrationLockDate)}
                    emptyNote="No lock — registrants can edit right up to the reunion." />
                <Button type="submit" size="sm" variant="secondary">Save lock date</Button>
            </form>
        </CardContent>
    </Card>
</section>

<!-- When it is and what it costs: the two things an organiser comes back to. Two forms in one card,
     each with its own Save — ?/update_dates and the tier actions write disjoint tables, so neither can
     clear the other's fields. That is the property that made the old single-card/single-Save rule
     necessary, and it does not apply here. -->
<section class="col-span-12 flex flex-col gap-6 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <CalendarRange class="text-muted-foreground size-4" />
                When
            </CardTitle>
            <CardDescription>
                The reunion's start and end. These drive the countdown on the home page and the
                schedule's default day.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/update_dates" use:enhance class="flex flex-col gap-4">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DateTimeField
                        id="startDate"
                        name="startDate"
                        label="Start"
                        value={toReunionWallClock(data.event.startDate)}
                        emptyNote="Not set — the home page shows no countdown." />
                    <DateTimeField
                        id="endDate"
                        name="endDate"
                        label="End"
                        value={toReunionWallClock(data.event.endDate)}
                        emptyNote="Not set — the reunion reads as a single day." />
                </div>
                <div>
                    <Button type="submit" size="sm" variant="secondary">Save dates</Button>
                </div>
            </form>
        </CardContent>
    </Card>

    <!-- The Setup landing links to #tiers, and this anchor is NEW — before the restructure that link
         went nowhere. It is load-bearing now, so do not rename it. -->
    <Card id="tiers" class="scroll-mt-6">
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Tags class="text-muted-foreground size-4" />
                Tiers & prices
            </CardTitle>
            <CardDescription>
                What each kind of attendee pays. Party members keep the label and price they were
                charged, so renaming or repricing never changes a registration that already exists.
            </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
            {#if data.tiers.length === 0}
                <p class="text-muted-foreground text-sm">
                    No tiers yet — the register form has nothing to offer until there is one.
                </p>
            {/if}

            <!-- COMPACT. Each tier was a bordered card holding two labelled fields and a full-width
                 Save, so four tiers filled a screen to show four labels and four numbers. Now one row
                 per tier with the labels carried once by a header, the price prefixed with $ instead of
                 captioned "Price ($)", and Delete as an icon.

                 The header is md:+ only. Stacked at 375px a row sits directly under its neighbour with
                 no header in reach, so each field keeps its own sr-only label — the visible header is
                 decoration for the wide case, never the only naming. -->
            {#if data.tiers.length > 0}
                <div
                    class={cn(
                        'hidden gap-3 px-1 md:grid md:grid-cols-[1fr_9rem_auto_auto] md:items-center',
                        SUBHEAD_CLASS,
                    )}>
                    <span>Label</span>
                    <span>Price</span>
                    <span class="sr-only">Save</span>
                    <span class="sr-only">Delete</span>
                </div>
            {/if}

            {#each data.tiers as tier (tier.id)}
                <!-- Two sibling forms share one four-track grid: display:contents on the update form
                     lifts its own children into that grid, so Save lands in track three and Delete in
                     track four. Drop it and the whole row collapses into a single cell. -->
                <div
                    class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_9rem_auto_auto] md:gap-3">
                    <form method="POST" action="?/update_tier" use:enhance class="contents">
                        <input type="hidden" name="tierId" value={tier.id} />
                        <Input
                            aria-label="Label for the {tier.label} tier"
                            name="label"
                            type="text"
                            value={tier.label}
                            required />
                        <!-- Dollars, not cents — the action multiplies by 100 on the way in. The $ is
                             in the box rather than in a caption above it, which is what let the whole
                             row lose its two field labels. -->
                        <div class="relative">
                            <span
                                class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                                $
                            </span>
                            <Input
                                aria-label="Price in dollars for the {tier.label} tier"
                                name="priceCents"
                                type="number"
                                inputmode="decimal"
                                step="0.01"
                                min="0"
                                value={formatPrice(tier.priceCents)}
                                class="pl-6"
                                required />
                        </div>
                        <Button type="submit" size="sm" variant="secondary">Save</Button>
                    </form>
                    <form method="POST" action="?/delete_tier" use:enhance>
                        <!-- Icon-only on md+, but never icon-only on mobile: stacked at 375px this is
                             a full-width control directly under Save with no confirmation behind it,
                             and an unlabelled bin there is one mis-tap from deleting a tier. -->
                        <input type="hidden" name="tierId" value={tier.id} />
                        <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            class="text-destructive w-full md:w-auto">
                            <X class="size-4" />
                            <span class="md:sr-only">Delete {tier.label}</span>
                        </Button>
                    </form>
                </div>
            {/each}

            <Separator />

            <form
                method="POST"
                action="?/add_tier"
                use:enhance
                class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_9rem_auto] md:gap-3">
                <Input
                    aria-label="Label for the new tier"
                    name="label"
                    type="text"
                    placeholder="Adult"
                    required />
                <div class="relative">
                    <span
                        class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                        $
                    </span>
                    <Input
                        aria-label="Price in dollars for the new tier"
                        name="priceCents"
                        type="number"
                        inputmode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        class="pl-6"
                        required />
                </div>
                <Button type="submit" size="sm" variant="secondary">
                    <Plus class="size-4" />
                    Add tier
                </Button>
            </form>
        </CardContent>
    </Card>
</section>

<!-- Standing alone, and last. It is a 96-line textarea plus a worked example, edited once a year;
     above the dates and the tiers it put the whole program between the organiser and the two fields
     they actually came back for. -->
<section class="col-span-12 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Braces class="text-muted-foreground size-4" />
                Program content
            </CardTitle>
            <CardDescription>
                Venue, food, places and the schedule — everything the program page shows, as one
                JSON object. Anything that does not parse — or uses a key that is not in the example
                — is rejected with a message and <strong>nothing is saved</strong>, so a bad paste
                can never blank the program page. Every key is optional.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" action="?/update_program" use:enhance class="flex flex-col gap-4">
                <Field.Field class="gap-2">
                    <Field.Label for="metadata">Event details JSON</Field.Label>
                    <!-- form?.metadata is the text that was just rejected. Falling back to it first
                         means a failed Save returns the owner's own paste to them, with the error
                         above it, rather than silently reverting to what is stored. -->
                    <Textarea
                        id="metadata"
                        name="metadata"
                        class="min-h-96 font-mono text-xs"
                        value={form?.metadata ?? JSON.stringify(data.event.metadata, null, 2)} />
                    <Field.Description>
                        <pre
                            class="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">{METADATA_EXAMPLE}</pre>
                    </Field.Description>
                </Field.Field>
                <div>
                    <Button type="submit" size="sm" variant="secondary">
                        Save program content
                    </Button>
                </div>
            </form>
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
