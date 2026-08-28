<script lang="ts">
import { ClipboardList, Link2, LogOut, Settings } from '@lucide/svelte'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { ThemeToggle } from '$lib/components'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Button } from '$lib/components/ui/button'
import { cn, getInitials } from '$lib/utils'

/* The admin's own header, replacing the public one.

   Theme and sign out were stranded at the bottom of the sidebar because the admin had no top of its own
   — the public marketing nav, Register call-to-action and all, sat above every admin page. They belong
   here.

   Organizer and Setup are UI modes, not roles. Everyone who can sign in is role 'admin'; Setup is
   additionally restricted by identity, and the pill is hidden rather than disabled for anyone who is not
   the owner — see requireOwner. Hiding is not the protection: every Setup load, action and remote
   function guards itself. This only stops advertising a door that will not open. */

const ORGANIZER_TABS = [
    { segment: 'registrations', label: 'Registrations', Icon: ClipboardList },
    { segment: 'attendees', label: 'Attendees', Icon: Link2 },
]

let {
    events,
    currentEventId,
    userName,
    isOwner,
}: {
    events: { id: string; year: number; title: string; status: string }[]
    /* Which event the Organizer links point at when the URL does not name one — Setup pages have no
       eventId in the path. */
    currentEventId: string | undefined
    userName: string
    isOwner: boolean
} = $props()

/* The event in the URL wins; the layout's fallback covers the Setup pages. */
let activeEventId = $derived(page.params.eventId ?? currentEventId)
let activeEvent = $derived(events.find((e) => e.id === activeEventId))

/* Setup owns more than /admin/setup: photos, storefront and admin accounts live at their own paths, and
   the event's own settings page lives UNDER the event path while still being owner-only Setup content.
   All of them light the Setup pill, and none of them show the Organizer tabs — otherwise the settings
   page would render Registrations/Attendees tabs with the Setup pill dark, which reads as Organizer. */
let inSetup = $derived(
    ['/admin/setup', '/admin/photos', '/admin/storefront', '/admin/users'].some((prefix) =>
        page.url.pathname.startsWith(prefix),
    ) || page.url.pathname.endsWith('/settings'),
)

/* Which Organizer tab, by the segment after the event id. A prefix match is right here: both
   …/registrations/new and …/registrations/<id> should light Registrations. */
function isActiveTab(segment: string): boolean {
    return page.url.pathname.startsWith(`/admin/event/${activeEventId}/${segment}`)
}

/* Switching year keeps you on the same kind of page rather than dumping you at a landing screen.
   Settings is deliberately excluded — it is owner-only, so a non-owner switching year from it would be
   sent somewhere they cannot see. */
function handleSelectEvent(nextId: string) {
    const segment = ORGANIZER_TABS.find((tab) => isActiveTab(tab.segment))?.segment
    goto(`/admin/event/${nextId}/${segment ?? 'registrations'}`)
}

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}
</script>

<header class="col-span-12 flex flex-col gap-3 border-b pb-3">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-semibold">
                {activeEvent?.title ?? 'No reunion yet'}
            </span>
            {#if events.length > 1 && activeEvent}
                <!-- The year as one quiet control. It replaces a row of pills that offered "All years"
                     as a peer of a specific year, appeared on five routes and not two others, and was a
                     filter dressed as navigation. -->
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
    </div>

    {#if activeEventId && !inSetup}
        <nav class="flex gap-1 overflow-x-auto">
            {#each ORGANIZER_TABS as { segment, label, Icon } (segment)}
                <a
                    href="/admin/event/{activeEventId}/{segment}"
                    aria-current={isActiveTab(segment) ? 'page' : undefined}
                    class={cn(
                        'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActiveTab(segment)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}>
                    <Icon class="size-4" />
                    {label}
                </a>
            {/each}
        </nav>
    {/if}
</header>
