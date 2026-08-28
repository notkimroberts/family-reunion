<script lang="ts">
import { ChevronDown, ClipboardPen, LogOut, Menu } from '@lucide/svelte'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Button } from '$lib/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '$lib/components/ui/dropdown-menu'
import {
    APP_NAME,
    CONTACT_NAV_LINK,
    PRIMARY_NAV_LINKS,
    REGISTER_NAV_LINK,
    SECONDARY_NAV_LINKS,
} from '$lib/general/constants'
import { getInitials } from '$lib/utils'
import MobileDrawer from './MobileDrawer.svelte'
import ThemeToggle from './ThemeToggle.svelte'

/* The theme toggle is unconditional — a visitor who prefers dark had no way to ask for it on desktop,
   since the only toggle lived in the mobile drawer. The account controls are conditional: rendering a
   sign-out button to someone who is not signed in advertises a session they do not have.

   Read from page.data rather than taken as a prop: the root layout returns `user` on every route, so
   there is nothing for the (app) layout to thread through. */
let user = $derived(page.data.user)

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}

function isActive(href: string): boolean {
    if (href === '/') {
        return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(href)
}

let familyActive = $derived(PRIMARY_NAV_LINKS.some((l) => isActive(l.href)))
let reunionActive = $derived(SECONDARY_NAV_LINKS.some((l) => isActive(l.href)))
let mobileMenuOpen = $state(false)
</script>

<header class="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b">
    <!-- Desktop: logo left, nav right -->
    <div class="hidden md:flex items-center h-20 mx-auto max-w-6xl px-6 gap-4 justify-between">
        <a href="/" class="flex items-center gap-3 shrink-0 group">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-10 h-10 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300 group-hover:ring-4 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-105" />
            <span
                class="text-sm font-semibold tracking-wide text-foreground/80 transition-colors group-hover:text-foreground">
                {APP_NAME}
            </span>
        </a>

        <nav class="flex items-center gap-0.5">
            {#if PRIMARY_NAV_LINKS.length}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                        {familyActive
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground hover:bg-muted'}">
                        Family
                        <ChevronDown class="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {#each PRIMARY_NAV_LINKS as link}
                            <DropdownMenuItem>
                                <a href={link.href} class="w-full">{link.label}</a>
                            </DropdownMenuItem>
                        {/each}
                    </DropdownMenuContent>
                </DropdownMenu>
            {/if}
            <a
                href={CONTACT_NAV_LINK.href}
                class="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground transition-colors hover:bg-muted">
                {CONTACT_NAV_LINK.label}
            </a>
            {#if SECONDARY_NAV_LINKS.length}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                        {reunionActive
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground hover:bg-muted'}">
                        Reunion
                        <ChevronDown class="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {#each SECONDARY_NAV_LINKS as link}
                            <DropdownMenuItem>
                                <a href={link.href} class="w-full">{link.label}</a>
                            </DropdownMenuItem>
                        {/each}
                    </DropdownMenuContent>
                </DropdownMenu>
            {/if}
            <a
                href={REGISTER_NAV_LINK.href}
                class="ml-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <ClipboardPen class="h-3.5 w-3.5" />
                {REGISTER_NAV_LINK.label}
            </a>

            <ThemeToggle size="sm" />

            {#if user}
                <Button variant="ghost" size="sm" onclick={handleSignOut}>
                    <LogOut class="h-3.5 w-3.5" />
                    Sign out
                </Button>
                <Avatar class="w-8 h-8">
                    <AvatarFallback class="bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
            {/if}
        </nav>
    </div>

    <!-- Mobile: logo left, theme + hamburger right. The toggle sits in the bar rather than inside the
         drawer, because "everyone can see it" and "it is two taps down behind a menu" are not the same
         thing. Account controls stay in the drawer — there is no room for them here. -->
    <div class="flex md:hidden items-center h-16 px-4 justify-between">
        <a href="/" class="flex items-center gap-2.5 shrink-0">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-9 h-9 rounded-full object-cover" />
            <span class="text-sm font-semibold text-foreground/80">{APP_NAME}</span>
        </a>
        <div class="flex items-center gap-1">
            <ThemeToggle size="sm" />
            <button
                onclick={() => (mobileMenuOpen = true)}
                aria-label="Open menu"
                class="p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu class="h-5 w-5" />
            </button>
        </div>
    </div>
</header>

<MobileDrawer open={mobileMenuOpen} onClose={() => (mobileMenuOpen = false)} />
