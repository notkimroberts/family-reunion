<script lang="ts">
import { ChevronDown, ClipboardPen, Menu } from '@lucide/svelte'
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
import {
    APP_NAME,
    LIGHT_THEME,
    primaryNavLinks,
    registerNavLink,
    secondaryNavLinks,
} from '$lib/general/constants'
import { theme } from '$lib/stores/theme'
import { getInitials } from '$lib/utils'
import MobileDrawer from './MobileDrawer.svelte'

type Props = {
    user: { name: string | null; role?: string | null } | null
    isAdmin: boolean
}

let { user, isAdmin }: Props = $props()

function isActive(href: string): boolean {
    if (href === '/') {
        return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(href)
}

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}

let familyActive = $derived(primaryNavLinks.some((l) => isActive(l.href)))
let reunionActive = $derived(secondaryNavLinks.some((l) => isActive(l.href)))
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
                    {#each primaryNavLinks as link}
                        <DropdownMenuItem>
                            <a href={link.href} class="w-full">{link.label}</a>
                        </DropdownMenuItem>
                    {/each}
                </DropdownMenuContent>
            </DropdownMenu>
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
                    {#each secondaryNavLinks as link}
                        <DropdownMenuItem>
                            <a href={link.href} class="w-full">{link.label}</a>
                        </DropdownMenuItem>
                    {/each}
                </DropdownMenuContent>
            </DropdownMenu>
            <a
                href={registerNavLink.href}
                class="ml-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <ClipboardPen class="h-3.5 w-3.5" />
                {registerNavLink.label}
            </a>
            {#if user}
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Avatar class="w-9 h-9 cursor-pointer ml-1">
                            <AvatarFallback
                                class="bg-primary text-primary-foreground text-sm font-bold">
                                {getInitials(user.name ?? '?')}
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-52">
                        <DropdownMenuItem
                            ><a href="/profile" class="w-full">Profile</a></DropdownMenuItem>
                        {#if isAdmin}
                            <DropdownMenuItem
                                ><a href="/admin" class="w-full">Admin</a></DropdownMenuItem>
                        {/if}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onclick={() => theme.toggle()}>
                            {$theme === LIGHT_THEME ? 'Switch to Dark' : 'Switch to Light'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onclick={handleSignOut}>Sign Out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            {/if}
        </nav>
    </div>

    <!-- Mobile: logo left, hamburger right -->
    <div class="flex md:hidden items-center h-16 px-4 justify-between">
        <a href="/" class="flex items-center gap-2.5 shrink-0">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-9 h-9 rounded-full object-cover" />
            <span class="text-sm font-semibold text-foreground/80">{APP_NAME}</span>
        </a>
        <button
            onclick={() => (mobileMenuOpen = true)}
            aria-label="Open menu"
            class="p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu class="h-5 w-5" />
        </button>
    </div>
</header>

<MobileDrawer open={mobileMenuOpen} {user} {isAdmin} onClose={() => (mobileMenuOpen = false)} />
