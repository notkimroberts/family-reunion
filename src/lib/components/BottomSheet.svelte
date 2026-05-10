<script lang="ts">
import { page } from '$app/state'
import { ThemeToggle } from '$lib/components'
import { getInitials } from '$lib/utils'

type MenuItem = {
    href: string
    label: string
}

type Props = {
    open: boolean
    onClose: () => void
    menuItems: MenuItem[]
    user: { name: string; role?: string | null } | null
    onSignOut: () => void
}

let { open, onClose, menuItems, user, onSignOut }: Props = $props()

function handleItemClick() {
    onClose()
}

function handleSignOut() {
    onSignOut()
    onClose()
}
</script>

{#if open}
    <div class="fixed inset-0 z-60 md:hidden">
        <button
            class="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onclick={onClose}
            aria-label="Close menu">
        </button>

        <div class="absolute bottom-0 left-0 right-0 animate-slide-up">
            <div
                class="rounded-t-2xl border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]">
                <div class="mx-auto my-3 h-1 w-10 rounded-full bg-base-300"></div>

                <nav class="px-4 pb-4">
                    <ul class="space-y-1">
                        {#each menuItems as item}
                            <li>
                                <a
                                    href={item.href}
                                    onclick={handleItemClick}
                                    class="flex min-h-[44px] items-center rounded-lg px-4 text-base transition-colors hover:bg-base-200 {page
                                        .url.pathname === item.href
                                        ? 'text-primary font-medium'
                                        : ''}">
                                    {item.label}
                                </a>
                            </li>
                        {/each}
                    </ul>

                    <div class="my-3 border-t border-base-200"></div>

                    <div class="flex min-h-[44px] items-center justify-between rounded-lg px-4">
                        <span class="text-sm text-base-content/60">Theme</span>
                        <ThemeToggle size="sm" />
                    </div>

                    <div class="my-3 border-t border-base-200"></div>

                    {#if user}
                        <div class="flex min-h-[44px] items-center rounded-lg px-4">
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-content">
                                    <span class="text-sm font-bold"
                                        >{getInitials(user.name ?? '?')}</span>
                                </div>
                                <span class="text-sm font-medium">{user.name}</span>
                            </div>
                        </div>
                        <a
                            href="/profile"
                            onclick={handleItemClick}
                            class="flex min-h-[44px] items-center rounded-lg px-4 text-base transition-colors hover:bg-base-200">
                            Profile
                        </a>
                        {#if user.role === 'admin'}
                            <a
                                href="/admin"
                                onclick={handleItemClick}
                                class="flex min-h-[44px] items-center rounded-lg px-4 text-base transition-colors hover:bg-base-200">
                                Admin
                            </a>
                        {/if}
                        <button
                            onclick={handleSignOut}
                            class="flex min-h-[44px] w-full items-center rounded-lg px-4 text-base text-error transition-colors hover:bg-base-200">
                            Sign Out
                        </button>
                    {:else}
                        <a
                            href="/login"
                            onclick={handleItemClick}
                            class="flex min-h-[44px] items-center rounded-lg px-4 text-base font-medium text-primary transition-colors hover:bg-base-200">
                            Sign In
                        </a>
                    {/if}
                </nav>
            </div>
        </div>
    </div>
{/if}

<style>
@keyframes slide-up {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

.animate-slide-up {
    animation: slide-up 0.25s ease-out;
}
</style>
