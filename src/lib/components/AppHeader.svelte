<script lang="ts">
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
import { APP_NAME, primaryNavLinks, secondaryNavLinks } from '$lib/general/constants'
import { getInitials } from '$lib/utils'
import ThemeToggle from './ThemeToggle.svelte'

type Props = {
    title: string
    user: { name: string | null; role?: string | null } | null
    isAdmin: boolean
}

let { title, user, isAdmin }: Props = $props()

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
</script>

<header class="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b">
    <!-- Desktop: 3-column grid so logo is truly centered -->
    <div
        class="hidden md:grid grid-cols-[1fr_auto_1fr] items-center h-24 mx-auto max-w-6xl px-6 gap-4">
        <nav class="flex items-center gap-0.5 justify-end">
            {#each primaryNavLinks as link}
                {@const active = isActive(link.href)}
                <a
                    href={link.href}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                        {active ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'}">
                    {link.label}
                </a>
            {/each}
        </nav>

        <a href="/" class="flex flex-col items-center gap-1 shrink-0 px-12 py-2 group">
            <span
                class="text-[10px] tracking-[0.2em] uppercase text-primary/70 transition-colors group-hover:text-primary">
                {APP_NAME}
            </span>
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-14 h-14 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300 group-hover:ring-4 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-105" />
        </a>

        <nav class="flex items-center gap-0.5">
            {#each secondaryNavLinks as link}
                {@const active = isActive(link.href)}
                <a
                    href={link.href}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                        {active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'}">
                    {link.label}
                </a>
            {/each}
            {#if user}
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Avatar class="w-9 h-9 cursor-pointer">
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
                        <div class="flex items-center justify-between px-2 py-1.5">
                            <span class="text-sm">Theme</span>
                            <ThemeToggle size="sm" />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onclick={handleSignOut}>Sign Out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            {/if}
        </nav>
    </div>

    <!-- Mobile: logo left, title center, avatar right -->
    <div class="flex md:hidden items-center h-16 px-4 gap-2">
        <a href="/" class="shrink-0">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-9 h-9 rounded-full object-cover" />
        </a>
        <span class="flex-1 text-center text-sm font-medium text-muted-foreground truncate px-2">
            {title}
        </span>
        {#if user}
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Avatar class="w-9 h-9 cursor-pointer shrink-0">
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
                    <div class="flex items-center justify-between px-2 py-1.5">
                        <span class="text-sm">Theme</span>
                        <ThemeToggle size="sm" />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onclick={handleSignOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        {/if}
    </div>
</header>
