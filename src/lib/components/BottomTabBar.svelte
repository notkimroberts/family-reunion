<script lang="ts">
import type { Component } from 'svelte'
import MdiAccountGroup from 'virtual:icons/mdi/account-group'
import MdiDotsHorizontal from 'virtual:icons/mdi/dots-horizontal'
import MdiFamilyTree from 'virtual:icons/mdi/family-tree'
import MdiHome from 'virtual:icons/mdi/home'
import MdiImageMultiple from 'virtual:icons/mdi/image-multiple'
import { page } from '$app/state'
import { primaryNavLinks } from '$lib/general/constants'

type Props = {
    onMoreClick: () => void
}

let { onMoreClick }: Props = $props()

const iconMap: Record<string, Component> = {
    'mdi/home': MdiHome,
    'mdi/image-multiple': MdiImageMultiple,
    'mdi/family-tree': MdiFamilyTree,
    'mdi/account-group': MdiAccountGroup,
}

function isActive(href: string): boolean {
    if (href === '/') {
        return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(href)
}
</script>

<nav
    class="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-base-100/95 backdrop-blur-md border-t border-base-300 pb-[env(safe-area-inset-bottom)]">
    <div class="flex">
        {#each primaryNavLinks as link}
            {@const Icon = iconMap[link.icon]}
            {@const active = isActive(link.href)}
            <a
                href={link.href}
                class="flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-xs font-medium transition-colors
                    {active ? 'text-primary' : 'text-base-content/50'}">
                <Icon class="h-6 w-6" />
                {link.label}
            </a>
        {/each}
        <button
            onclick={onMoreClick}
            class="flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-xs font-medium text-base-content/50 transition-colors hover:text-base-content">
            <MdiDotsHorizontal class="h-6 w-6" />
            More
        </button>
    </div>
</nav>
