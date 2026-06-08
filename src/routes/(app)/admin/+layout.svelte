<script lang="ts">
import {
    CalendarDays,
    ClipboardList,
    Images,
    LayoutDashboard,
    Link2,
    LogOut,
    Moon,
    Sun,
    ShoppingBag,
    Users,
} from '@lucide/svelte'
import { setContext } from 'svelte'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Separator } from '$lib/components/ui/separator'
import { LIGHT_THEME } from '$lib/general/constants'
import { theme } from '$lib/stores/theme.svelte'
import type { AdminContext } from '$lib/types/adminContext'
import { cn, getInitials } from '$lib/utils'

let { data, children } = $props()

/* eventId lives in the URL (?eventId=…) so the choice survives refresh, deep
   links, and tab navigation. 'all' is the absence of the param. */
let selectedEventId = $derived(page.url.searchParams.get('eventId') ?? 'all')

function setSelectedEventId(id: string) {
    const url = new URL(page.url)
    if (id === 'all') {
        url.searchParams.delete('eventId')
    } else {
        url.searchParams.set('eventId', id)
    }
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
}

setContext<AdminContext>('admin', {
    get selectedEventId() {
        return selectedEventId
    },
    setSelectedEventId,
    get events() {
        return data.events
    },
})

const navLinks = [
    { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/events', label: 'Events', Icon: CalendarDays },
    { href: '/admin/users', label: 'Users', Icon: Users },
    { href: '/admin/photos', label: 'Photos', Icon: Images },
    { href: '/admin/registrations', label: 'Registrations', Icon: ClipboardList },
    { href: '/admin/attendees', label: 'Attendees', Icon: Link2 },
    { href: '/admin/storefront', label: 'Storefront', Icon: ShoppingBag },
]

/* Routes that filter by event — the year selector is rendered above them.
   /admin/events and /admin/storefront manage cross-year or open-event-only
   data and intentionally don't react to the filter. */
const SELECTOR_PATHS = [
    '/admin',
    '/admin/users',
    '/admin/photos',
    '/admin/registrations',
    '/admin/attendees',
]
let showYearSelector = $derived.by(() => {
    const path = page.url.pathname
    if (path === '/admin') {
        return true
    }
    return SELECTOR_PATHS.some((p) => p !== '/admin' && (path === p || path.startsWith(`${p}/`)))
})

/* Preserve the year filter across admin tab navigation. */
function navHref(href: string): string {
    const eventId = page.url.searchParams.get('eventId')
    return eventId ? `${href}?eventId=${encodeURIComponent(eventId)}` : href
}

function isActive(href: string): boolean {
    if (href === '/admin') {
        return page.url.pathname === '/admin'
    }
    return page.url.pathname.startsWith(href)
}

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}
</script>

<!-- Mobile-only admin top bar (sidebar is desktop only) -->
<div class="col-span-12 md:hidden flex items-center justify-between gap-3 -mt-2 mb-2">
    <div class="flex items-center gap-2 min-w-0">
        <Avatar class="w-8 h-8 shrink-0">
            <AvatarFallback class="bg-primary text-primary-foreground text-xs font-bold">
                {getInitials(data.user.name)}
            </AvatarFallback>
        </Avatar>
        <span class="text-sm font-medium truncate">{data.user.name}</span>
    </div>
    <button
        onclick={handleSignOut}
        class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
        <LogOut class="h-3.5 w-3.5" />
        Sign out
    </button>
</div>

<div class="col-span-12 flex items-start gap-0">
    <aside class="hidden md:flex w-52 shrink-0 flex-col self-start sticky top-28 border-r pr-5">
        <nav class="flex flex-col gap-0.5">
            {#each navLinks as { href, label, Icon } (href)}
                <a
                    href={navHref(href)}
                    class={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive(href)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}>
                    <Icon class="h-4 w-4 shrink-0" />
                    {label}
                </a>
            {/each}
        </nav>

        <Separator class="my-4" />

        <div class="flex items-center gap-2 px-3 pb-2">
            <Avatar class="w-7 h-7 shrink-0">
                <AvatarFallback class="bg-primary text-primary-foreground text-xs font-bold">
                    {getInitials(data.user.name)}
                </AvatarFallback>
            </Avatar>
            <span class="text-xs font-medium truncate">{data.user.name}</span>
        </div>
        <button
            onclick={() => theme.toggle()}
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left">
            {#if theme.current === LIGHT_THEME}
                <Moon class="h-4 w-4" />
                Dark mode
            {:else}
                <Sun class="h-4 w-4" />
                Light mode
            {/if}
        </button>
        <button
            onclick={handleSignOut}
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left">
            <LogOut class="h-4 w-4" />
            Sign out
        </button>
    </aside>

    <div class="flex-1 min-w-0 md:pl-6">
        <div class="grid grid-cols-12 gap-y-8 md:gap-y-10">
            {#if showYearSelector && data.events.length > 0}
                <section class="col-span-12">
                    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            class={cn(
                                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                                selectedEventId === 'all'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                            )}
                            onclick={() => setSelectedEventId('all')}>
                            All years
                        </button>
                        {#each data.events as event (event.id)}
                            <button
                                class={cn(
                                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                                    selectedEventId === event.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                )}
                                onclick={() => setSelectedEventId(event.id)}>
                                {event.year}
                            </button>
                        {/each}
                    </div>
                </section>
            {/if}
            {@render children()}
        </div>
    </div>
</div>
