<script lang="ts">
import {
    CalendarClock,
    ClipboardPen,
    Home,
    Images,
    Network,
    ShoppingBag,
    Users,
} from '@lucide/svelte'
import type { Component } from 'svelte'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { Separator } from '$lib/components/ui/separator'
import { Sheet, SheetContent } from '$lib/components/ui/sheet'
import {
    APP_NAME,
    LIGHT_THEME,
    primaryNavLinks,
    registerNavLink,
    secondaryNavLinks,
} from '$lib/general/constants'
import { theme } from '$lib/stores/theme'

type Props = {
    open: boolean
    user: { name: string | null; role?: string | null } | null
    isAdmin: boolean
    onClose: () => void
}

let { open, user, isAdmin, onClose }: Props = $props()

const iconMap: Record<string, Component> = {
    images: Images,
    network: Network,
    users: Users,
    'calendar-clock': CalendarClock,
    'shopping-bag': ShoppingBag,
}

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

const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`
</script>

<Sheet {open} onOpenChange={(o) => !o && onClose()}>
    <SheetContent side="left" class="w-72 p-0 flex flex-col gap-0">
        <div class="flex items-center gap-3 px-4 py-4 border-b">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-8 h-8 rounded-full object-cover" />
            <span class="font-semibold text-sm">{APP_NAME}</span>
        </div>

        <nav class="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
            <a href="/" onclick={onClose} class={linkClass(isActive('/'))}>
                <Home class="h-4 w-4" />
                Home
            </a>

            <p
                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">
                Family
            </p>
            {#each primaryNavLinks as link}
                {@const Icon = iconMap[link.icon]}
                <a href={link.href} onclick={onClose} class={linkClass(isActive(link.href))}>
                    <Icon class="h-4 w-4" />
                    {link.label}
                </a>
            {/each}

            <p
                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">
                Reunion
            </p>
            {#each secondaryNavLinks as link}
                {@const Icon = iconMap[link.icon]}
                <a href={link.href} onclick={onClose} class={linkClass(isActive(link.href))}>
                    <Icon class="h-4 w-4" />
                    {link.label}
                </a>
            {/each}

            <div class="pt-3">
                <a
                    href={registerNavLink.href}
                    onclick={onClose}
                    class="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <ClipboardPen class="h-4 w-4" />
                    {registerNavLink.label}
                </a>
            </div>
        </nav>

        <div class="border-t p-3 flex flex-col gap-0.5">
            <button
                onclick={() => theme.toggle()}
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors w-full text-left cursor-pointer">
                {$theme === LIGHT_THEME ? 'Switch to Dark' : 'Switch to Light'}
            </button>

            {#if user}
                <Separator class="my-1" />
                <a href="/profile" onclick={onClose} class={linkClass(isActive('/profile'))}>
                    Profile
                </a>
                {#if isAdmin}
                    <a href="/admin" onclick={onClose} class={linkClass(isActive('/admin'))}>
                        Admin
                    </a>
                {/if}
                <button
                    onclick={handleSignOut}
                    class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left cursor-pointer">
                    Sign Out
                </button>
            {:else}
                <a href="/login" onclick={onClose} class={linkClass(false)}>Sign In</a>
            {/if}
        </div>
    </SheetContent>
</Sheet>
