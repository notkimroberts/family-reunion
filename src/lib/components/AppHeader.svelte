<script lang="ts">
import { ClipboardPen, HeartHandshake, LayoutDashboard, LogOut, Menu } from '@lucide/svelte'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '$lib/components/ui/dropdown-menu'
import { APP_NAME, DONATE_NAV_LINK, REGISTER_NAV_LINK } from '$lib/general/constants'
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

let mobileMenuOpen = $state(false)
</script>

<header class="bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md print:hidden">
    <!-- Desktop: logo left, nav right -->
    <div class="mx-auto hidden h-20 max-w-6xl items-center justify-between gap-4 px-6 md:flex">
        <a href="/" class="group flex shrink-0 items-center gap-3">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="ring-primary ring-offset-background group-hover:shadow-primary/30 h-10 w-10 rounded-full object-cover ring-2 ring-offset-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:ring-4" />
            <span
                class="text-foreground/80 group-hover:text-foreground text-sm font-semibold tracking-wide transition-colors">
                {APP_NAME}
            </span>
        </a>

        <nav class="flex items-center gap-0.5">
            <!-- Outline, and left of Register: giving is a real path through the site, but the one
                 thing most visitors are here to do is book a place, so only that is filled. -->
            <a
                href={DONATE_NAV_LINK.href}
                class="hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors">
                <HeartHandshake class="text-primary h-3.5 w-3.5" />
                {DONATE_NAV_LINK.label}
            </a>

            <a
                href={REGISTER_NAV_LINK.href}
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                <ClipboardPen class="h-3.5 w-3.5" />
                {REGISTER_NAV_LINK.label}
            </a>

            <ThemeToggle size="sm" />

            {#if user}
                <!-- Sign out sits behind the avatar rather than beside it. It is a rare, destructive-ish
                     action next to a Register call-to-action, and a permanent button for it earns its
                     width about once a session. The menu also has room to say WHICH account you are
                     signed in as, which a bare avatar cannot. -->
                <DropdownMenu>
                    <DropdownMenuTrigger
                        class="ring-offset-background hover:ring-primary/40 focus-visible:ring-ring rounded-full transition-shadow hover:ring-2 hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        aria-label="Account menu">
                        <Avatar class="h-8 w-8">
                            <AvatarFallback
                                class="bg-primary text-primary-foreground text-xs font-bold">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-56">
                        <div class="flex flex-col gap-0.5 px-2 py-1.5">
                            <span class="text-sm font-medium">{user.name}</span>
                            <span class="text-muted-foreground truncate text-xs">{user.email}</span>
                        </div>
                        <DropdownMenuSeparator />
                        <!-- The admin area has no entry point in the nav — /login redirects to it once,
                             and after that an organiser had to type the URL. It belongs behind the
                             avatar because it is per-account, not per-visitor. -->
                        {#if user.role === 'admin'}
                            <DropdownMenuItem>
                                {#snippet child({ props })}
                                    <a href="/admin" {...props}>
                                        <LayoutDashboard class="h-4 w-4" />
                                        Admin
                                    </a>
                                {/snippet}
                            </DropdownMenuItem>
                        {/if}
                        <DropdownMenuItem onSelect={handleSignOut}>
                            <LogOut class="h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            {/if}
        </nav>
    </div>

    <!-- Mobile: logo left, theme + hamburger right. The toggle sits in the bar rather than inside the
         drawer, because "everyone can see it" and "it is two taps down behind a menu" are not the same
         thing. Account controls stay in the drawer — there is no room for them here. -->
    <div class="flex h-16 items-center justify-between px-4 md:hidden">
        <a href="/" class="flex shrink-0 items-center gap-2.5">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="h-9 w-9 rounded-full object-cover" />
            <span class="text-foreground/80 text-sm font-semibold">{APP_NAME}</span>
        </a>
        <div class="flex items-center gap-1">
            <ThemeToggle size="sm" />
            <button
                onclick={() => (mobileMenuOpen = true)}
                aria-label="Open menu"
                class="hover:bg-muted rounded-lg p-2 transition-colors">
                <Menu class="h-5 w-5" />
            </button>
        </div>
    </div>
</header>

<MobileDrawer open={mobileMenuOpen} onClose={() => (mobileMenuOpen = false)} />
