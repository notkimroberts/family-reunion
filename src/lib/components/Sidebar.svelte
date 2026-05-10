<script lang="ts">
import type { Component } from 'svelte'
import MdiAccountGroup from 'virtual:icons/mdi/account-group'
import MdiCalendarClock from 'virtual:icons/mdi/calendar-clock'
import MdiClipboardEdit from 'virtual:icons/mdi/clipboard-edit'
import MdiEmail from 'virtual:icons/mdi/email'
import MdiFamilyTree from 'virtual:icons/mdi/family-tree'
import MdiHome from 'virtual:icons/mdi/home'
import MdiImageMultiple from 'virtual:icons/mdi/image-multiple'
import MdiShieldCrown from 'virtual:icons/mdi/shield-crown'
import MdiShopping from 'virtual:icons/mdi/shopping'
import { page } from '$app/state'
import { APP_NAME, sidebarLinks, adminSidebarGroup, isSidebarGroup } from '$lib/general/constants'

type Props = {
    isAdmin: boolean
}

let { isAdmin }: Props = $props()

const iconMap: Record<string, Component> = {
    'mdi/home': MdiHome,
    'mdi/image-multiple': MdiImageMultiple,
    'mdi/family-tree': MdiFamilyTree,
    'mdi/account-group': MdiAccountGroup,
    'mdi/calendar-clock': MdiCalendarClock,
    'mdi/shopping': MdiShopping,
    'mdi/clipboard-edit': MdiClipboardEdit,
    'mdi/email': MdiEmail,
    'mdi/shield-crown': MdiShieldCrown,
}

function isActive(href: string): boolean {
    if (href === '/') {
        return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(href)
}
</script>

<nav class="bg-base-100 flex min-h-screen w-72 flex-col overflow-y-auto px-6 py-10">
    <div class="mx-4 flex items-center gap-2 font-heading font-bold text-primary text-lg">
        {APP_NAME}
    </div>

    <ul class="menu mt-6 w-full gap-1">
        {#each sidebarLinks as item}
            {#if !isSidebarGroup(item)}
                {@const Icon = iconMap[item.icon]}
                <li>
                    <a href={item.href} class:active={isActive(item.href)}>
                        <Icon class="h-5 w-5" />
                        {item.label}
                    </a>
                </li>
            {/if}
        {/each}

        {#if isAdmin}
            {@const AdminIcon = iconMap[adminSidebarGroup.icon]}
            <li>
                <details>
                    <summary>
                        <AdminIcon class="h-5 w-5" />
                        {adminSidebarGroup.label}
                    </summary>
                    <ul>
                        {#each adminSidebarGroup.children as child}
                            <li>
                                <a href={child.href} class:active={isActive(child.href)}>
                                    {child.label}
                                </a>
                            </li>
                        {/each}
                    </ul>
                </details>
            </li>
        {/if}
    </ul>

    <div class="mt-auto mx-4 pt-6">
        <a href="/changelog" class="text-xs text-base-content/50 hover:text-base-content/75">
            v{__APP_VERSION__}
        </a>
    </div>
</nav>
