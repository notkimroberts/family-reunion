<script lang="ts">
import {
    CalendarCog,
    CalendarDays,
    ChevronRight,
    Images,
    ShoppingBag,
    Tags,
    Users,
} from '@lucide/svelte'

/* Set once a year, then left alone. Deliberately quieter than the Organizer side — no numbers, no
   urgency, no colour. Being here should feel like opening a drawer. */

let { data } = $props()

/* Two entries need an event id. currentEventId is the open reunion, else the most recent, from the admin
   layout — Setup has no event in its own URL. */
let links = $derived([
    {
        label: 'Event details & schedule',
        note: 'Venue, dates, menu, and what happens when',
        Icon: CalendarCog,
        href: data.currentEventId
            ? `/admin/event/${data.currentEventId}/settings`
            : '/admin/setup/events',
    },
    {
        label: 'Tiers & prices',
        note: 'What each kind of attendee pays',
        Icon: Tags,
        href: data.currentEventId
            ? `/admin/event/${data.currentEventId}/settings#tiers`
            : '/admin/setup/events',
    },
    {
        label: 'Reunion years',
        note: 'Add a year, or open and close registration',
        Icon: CalendarDays,
        href: '/admin/setup/events',
    },
    {
        /* Not "Upload" — the upload action lives on the gallery page, not here. Three separate places in
           the codebase claimed otherwise; admin/photos has exactly one action, delete_photo. */
        label: 'Photos',
        note: 'Remove photos from the gallery',
        Icon: Images,
        href: '/admin/photos',
    },
    {
        label: 'Storefront',
        note: 'Shirts and merchandise for the open year',
        Icon: ShoppingBag,
        href: '/admin/storefront',
    },
    {
        label: 'Admin accounts',
        note: 'Who can sign in here',
        Icon: Users,
        href: '/admin/users',
    },
])
</script>

<svelte:head>
    <title>Setup — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-4 xl:col-span-8">
    <div class="flex flex-col gap-1">
        <h1>Setup</h1>
        <p class="text-muted-foreground text-sm">
            Set once a year, then left alone. Nothing here needs looking at while registrations are
            coming in.
        </p>
    </div>

    <div class="flex flex-col gap-2">
        {#each links as { label, note, Icon, href } (label)}
            <a
                {href}
                class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted">
                <Icon class="text-muted-foreground size-4 shrink-0" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium">{label}</p>
                    <p class="text-muted-foreground text-xs">{note}</p>
                </div>
                <ChevronRight class="text-muted-foreground size-4 shrink-0" />
            </a>
        {/each}
    </div>
</section>
