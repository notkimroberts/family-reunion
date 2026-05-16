<script lang="ts">
import { Home, Images, MoreHorizontal, Network, Users } from '@lucide/svelte'
import type { Component } from 'svelte'
import { page } from '$app/state'
import { primaryNavLinks } from '$lib/general/constants'

type Props = {
    onMoreClick: () => void
}

let { onMoreClick }: Props = $props()

const iconMap: Record<string, Component> = {
    home: Home,
    images: Images,
    network: Network,
    users: Users,
}

function isActive(href: string): boolean {
    if (href === '/') {
        return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(href)
}
</script>

<nav
    class="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur-md border-t pb-[env(safe-area-inset-bottom)]">
    <div class="flex">
        {#each primaryNavLinks as link}
            {@const Icon = iconMap[link.icon]}
            {@const active = isActive(link.href)}
            <a
                href={link.href}
                class="flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-xs font-medium transition-colors
                    {active ? 'text-primary' : 'text-muted-foreground'}">
                <Icon size={24} />
                {link.label}
            </a>
        {/each}
        <button
            onclick={onMoreClick}
            class="flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <MoreHorizontal size={24} />
            More
        </button>
    </div>
</nav>
