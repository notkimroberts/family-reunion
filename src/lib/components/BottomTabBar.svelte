<script lang="ts">
import MdiMenu from 'virtual:icons/mdi/menu'
import { page } from '$app/state'

type Tab = {
    href: string
    label: string
    icon: string
}

type Props = {
    tabs: Tab[]
    onMenuOpen: () => void
}

let { tabs, onMenuOpen }: Props = $props()
</script>

<nav
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-base-300 bg-base-200/80 backdrop-blur-md md:hidden">
    <div class="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {#each tabs as tab}
            <a
                href={tab.href}
                class="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors {page
                    .url.pathname === tab.href
                    ? 'text-primary'
                    : 'text-base-content/60'}">
                <span class="text-xl">{tab.icon}</span>
                <span class="text-[10px] font-medium">{tab.label}</span>
            </a>
        {/each}
        <button
            onclick={onMenuOpen}
            class="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-base-content/60 transition-colors">
            <MdiMenu class="h-5 w-5" />
            <span class="text-[10px] font-medium">Menu</span>
        </button>
    </div>
</nav>
