<script lang="ts">
import type { Component } from 'svelte'
import MdiCalendarClock from 'virtual:icons/mdi/calendar-clock'
import MdiClipboardEdit from 'virtual:icons/mdi/clipboard-edit'
import MdiClose from 'virtual:icons/mdi/close'
import MdiEmail from 'virtual:icons/mdi/email'
import MdiShieldCrown from 'virtual:icons/mdi/shield-crown'
import MdiShopping from 'virtual:icons/mdi/shopping'
import { authClient } from '$lib/auth-client'
import { secondaryNavLinks } from '$lib/general/constants'
import { getInitials } from '$lib/utils'
import ThemeToggle from './ThemeToggle.svelte'

type Props = {
    open: boolean
    user: { name: string | null; role?: string | null } | null
    isAdmin: boolean
    onClose: () => void
}

let { open, user, isAdmin, onClose }: Props = $props()

const iconMap: Record<string, Component> = {
    'mdi/calendar-clock': MdiCalendarClock,
    'mdi/shopping': MdiShopping,
    'mdi/clipboard-edit': MdiClipboardEdit,
    'mdi/email': MdiEmail,
}

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}
</script>

{#if open}
    <div
        class="fixed inset-0 z-40 bg-base-content/20 md:hidden"
        onclick={onClose}
        role="presentation">
    </div>

    <div
        class="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-base-100 rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div class="flex items-center justify-between px-5 pt-4 pb-2">
            <span class="text-xs font-semibold text-base-content/50 uppercase tracking-widest">
                More
            </span>
            <button onclick={onClose} class="btn btn-circle btn-ghost btn-sm">
                <MdiClose class="h-5 w-5" />
            </button>
        </div>

        <div class="px-4 pb-4">
            <ul class="menu w-full gap-1 p-0">
                {#each secondaryNavLinks as link}
                    {@const Icon = iconMap[link.icon]}
                    <li>
                        <a href={link.href} onclick={onClose} class="flex items-center gap-3 py-3">
                            <Icon class="h-5 w-5" />
                            <span class="font-medium">{link.label}</span>
                        </a>
                    </li>
                {/each}
                {#if isAdmin}
                    <li>
                        <a href="/admin" onclick={onClose} class="flex items-center gap-3 py-3">
                            <MdiShieldCrown class="h-5 w-5" />
                            <span class="font-medium">Admin</span>
                        </a>
                    </li>
                {/if}
            </ul>

            <div class="divider my-2"></div>

            <div class="flex items-center justify-between px-2 py-2">
                <span class="text-sm text-base-content/70">Theme</span>
                <ThemeToggle size="sm" />
            </div>

            {#if user}
                <div class="flex items-center justify-between px-2 py-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <div
                                class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold shrink-0">
                                {getInitials(user.name ?? '?')}
                            </div>
                            <div>
                                <p class="font-medium text-sm">{user.name}</p>
                                <a
                                    href="/profile"
                                    onclick={onClose}
                                    class="text-xs text-primary hover:underline">
                                    View Profile
                                </a>
                            </div>
                        </div>
                    </div>
                    <button onclick={handleSignOut} class="btn btn-ghost btn-sm text-error">
                        Sign Out
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}
