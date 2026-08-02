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
import { Sheet, SheetContent } from '$lib/components/ui/sheet'
import {
    APP_NAME,
    LIGHT_THEME,
    PRIMARY_NAV_LINKS,
    PROGRAM_NAV_LINK,
    REGISTER_NAV_LINK,
    SECONDARY_NAV_LINKS,
} from '$lib/general/constants'
import { theme } from '$lib/stores/theme.svelte'

type Props = {
    open: boolean
    onClose: () => void
}

let { open, onClose }: Props = $props()

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
            <a
                href={PROGRAM_NAV_LINK.href}
                onclick={onClose}
                class={linkClass(isActive(PROGRAM_NAV_LINK.href))}>
                <CalendarClock class="h-4 w-4" />
                {PROGRAM_NAV_LINK.label}
            </a>
            {#if PRIMARY_NAV_LINKS.length}
                <p
                    class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">
                    Family
                </p>
            {/if}
            {#each PRIMARY_NAV_LINKS as link}
                {@const Icon = iconMap[link.icon]}
                <a href={link.href} onclick={onClose} class={linkClass(isActive(link.href))}>
                    <Icon class="h-4 w-4" />
                    {link.label}
                </a>
            {/each}

            {#if SECONDARY_NAV_LINKS.length}
                <p
                    class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">
                    Reunion
                </p>
            {/if}
            {#each SECONDARY_NAV_LINKS as link}
                {@const Icon = iconMap[link.icon]}
                <a href={link.href} onclick={onClose} class={linkClass(isActive(link.href))}>
                    <Icon class="h-4 w-4" />
                    {link.label}
                </a>
            {/each}

            <div class="pt-3">
                <a
                    href={REGISTER_NAV_LINK.href}
                    onclick={onClose}
                    class="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <ClipboardPen class="h-4 w-4" />
                    {REGISTER_NAV_LINK.label}
                </a>
            </div>
        </nav>

        <div class="border-t p-3">
            <button
                onclick={() => theme.toggle()}
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors w-full text-left cursor-pointer">
                {theme.current === LIGHT_THEME ? 'Switch to Dark' : 'Switch to Light'}
            </button>
        </div>
    </SheetContent>
</Sheet>
