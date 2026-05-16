<script lang="ts">
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
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

<header class="sticky top-0 z-30 bg-base-300/90 backdrop-blur-md border-b border-base-300">
    <!-- Desktop: 3-column grid so logo is truly centered -->
    <div
        class="hidden md:grid grid-cols-[1fr_auto_1fr] items-center h-24 mx-auto max-w-6xl px-6 gap-4">
        <nav class="flex items-center gap-0.5 justify-end">
            {#each primaryNavLinks as link}
                {@const active = isActive(link.href)}
                <a
                    href={link.href}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                        {active
                        ? 'bg-primary/15 text-primary'
                        : 'text-base-content hover:bg-base-content/10'}">
                    {link.label}
                </a>
            {/each}
        </nav>

        <a href="/" class="flex flex-col items-center gap-1 shrink-0 px-12 py-2 group">
            <span
                class="font-heading text-[10px] tracking-[0.2em] uppercase text-primary/70 transition-colors group-hover:text-primary">
                {APP_NAME}
            </span>
            <div class="avatar">
                <div
                    class="w-14 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-100 transition-all duration-300 group-hover:ring-4 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-105">
                    <img src="/will_and_roxie_favicon_64.png" alt={APP_NAME} class="object-cover" />
                </div>
            </div>
        </a>

        <nav class="flex items-center gap-0.5">
            {#each secondaryNavLinks as link}
                {@const active = isActive(link.href)}
                <a
                    href={link.href}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                        {active
                        ? 'bg-primary/15 text-primary'
                        : 'text-base-content/70 hover:text-base-content hover:bg-base-content/10'}">
                    {link.label}
                </a>
            {/each}
            {#if user}
                <div class="dropdown dropdown-end z-10">
                    <div
                        tabindex="0"
                        role="button"
                        class="btn btn-circle btn-ghost avatar avatar-placeholder">
                        <div class="w-9 rounded-full bg-primary text-primary-content">
                            <span class="text-sm font-bold">{getInitials(user.name ?? '?')}</span>
                        </div>
                    </div>
                    <ul
                        tabindex="0"
                        class="menu dropdown-content rounded-box bg-base-100 mt-3 w-52 p-2 shadow-2xl">
                        <li><a href="/profile">Profile</a></li>
                        {#if isAdmin}
                            <li><a href="/admin">Admin</a></li>
                        {/if}
                        <li>
                            <div class="flex items-center justify-between">
                                <span>Theme</span>
                                <ThemeToggle size="sm" />
                            </div>
                        </li>
                        <li><button onclick={handleSignOut}>Sign Out</button></li>
                    </ul>
                </div>
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
        <span class="flex-1 text-center text-sm font-medium text-base-content/60 truncate px-2">
            {title}
        </span>
        {#if user}
            <div class="dropdown dropdown-end z-10 shrink-0">
                <div
                    tabindex="0"
                    role="button"
                    class="btn btn-circle btn-ghost avatar avatar-placeholder">
                    <div class="w-9 rounded-full bg-primary text-primary-content">
                        <span class="text-sm font-bold">{getInitials(user.name ?? '?')}</span>
                    </div>
                </div>
                <ul
                    tabindex="0"
                    class="menu dropdown-content rounded-box bg-base-100 mt-3 w-52 p-2 shadow-2xl">
                    <li><a href="/profile">Profile</a></li>
                    {#if isAdmin}
                        <li><a href="/admin">Admin</a></li>
                    {/if}
                    <li>
                        <div class="flex items-center justify-between">
                            <span>Theme</span>
                            <ThemeToggle size="sm" />
                        </div>
                    </li>
                    <li><button onclick={handleSignOut}>Sign Out</button></li>
                </ul>
            </div>
        {/if}
    </div>
</header>
