<script lang="ts">
import { LogOut, Settings } from '@lucide/svelte'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { ThemeToggle } from '$lib/components'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Button } from '$lib/components/ui/button'
import { getInitials } from '$lib/utils'

/* The admin's own header, replacing the public one.

   Theme and sign out were stranded at the bottom of the sidebar because the admin had no top of its own
   — the public marketing nav, Register call-to-action and all, sat above every admin page.

   There is no tab row. Organizer is a single destination now that registrations and people are two lenses
   on one page, and a nav bar with one item in it is furniture, not navigation.

   Organizer and Setup are UI modes, not roles. Everyone who can sign in is role 'admin'; Setup is
   additionally restricted by identity, and the button is hidden rather than disabled for anyone who is not
   the owner — see requireOwner. Hiding is not the protection: every Setup load, action and remote
   function guards itself. This only stops advertising a door that will not open. */

let {
    events,
    currentEventId,
    userName,
    isOwner,
}: {
    events: { id: string; year: number; title: string; status: string }[]
    /* Which event the links point at when the URL does not name one — Setup pages have no eventId in
       the path. */
    currentEventId: string | undefined
    userName: string
    isOwner: boolean
} = $props()

/* The event in the URL wins; the layout's fallback covers the Setup pages. */
let activeEventId = $derived(page.params.eventId ?? currentEventId)
let activeEvent = $derived(events.find((e) => e.id === activeEventId))

/* Setup owns more than /admin/setup: photos, storefront and admin accounts live at their own paths, and
   the event's settings page lives UNDER the event path while still being owner-only Setup content. */
let inSetup = $derived(
    ['/admin/setup', '/admin/photos', '/admin/storefront', '/admin/users'].some((prefix) =>
        page.url.pathname.startsWith(prefix),
    ) || page.url.pathname.endsWith('/settings'),
)

/* Switching year lands on the registrations list rather than wherever you were. Settings is owner-only,
   so carrying a non-owner across from it would send them somewhere they cannot see; and the ?view lens
   is a property of the list you were reading, not of the year you asked for. */
function handleSelectEvent(nextId: string) {
    goto(`/admin/event/${nextId}/registrations`)
}

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}
</script>

<header class="col-span-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3">
    <div class="flex min-w-0 items-center gap-2">
        <a
            href={activeEventId ? `/admin/event/${activeEventId}/registrations` : '/admin'}
            class="truncate text-sm font-semibold hover:underline">
            {activeEvent?.title ?? 'No reunion yet'}
        </a>
        {#if events.length > 1 && activeEvent}
            <!-- The year as one quiet control. It replaces a row of pills that offered "All years" as a
                 peer of a specific year, appeared on five routes and not two others, and was a filter
                 dressed as navigation. -->
            <select
                aria-label="Reunion year"
                class="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                value={activeEvent.id}
                onchange={(changed) => handleSelectEvent(changed.currentTarget.value)}>
                {#each events as option (option.id)}
                    <option value={option.id}>{option.year}</option>
                {/each}
            </select>
        {/if}
    </div>

    <div class="ml-auto flex items-center gap-1">
        {#if isOwner}
            <Button
                href="/admin/setup"
                variant={inSetup ? 'secondary' : 'ghost'}
                size="sm"
                aria-current={inSetup ? 'page' : undefined}>
                <Settings class="size-4" />
                Setup
            </Button>
        {/if}
        <ThemeToggle size="sm" />
        <Button variant="ghost" size="sm" onclick={handleSignOut}>
            <LogOut class="size-4" />
            <span class="hidden sm:inline">Sign out</span>
        </Button>
        <Avatar class="size-8">
            <AvatarFallback class="bg-primary text-primary-foreground text-xs font-bold">
                {getInitials(userName)}
            </AvatarFallback>
        </Avatar>
    </div>
</header>
