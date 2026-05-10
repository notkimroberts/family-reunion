<script lang="ts">
import { onMount } from 'svelte'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { BottomSheet, BottomTabBar, ThemeToggle } from '$lib/components'
import { APP_NAME, mobileTabs, mobileMenuItems, navLinks } from '$lib/general/constants'
import { theme } from '$lib/stores/theme'
import { getInitials } from '$lib/utils'
import '../app.css'

let { children, data } = $props()
let menuOpen = $state(false)

onMount(() => {
    theme.init()
})

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}

function handleMenuOpen() {
    menuOpen = true
}

function handleMenuClose() {
    menuOpen = false
}
</script>

<div class="flex min-h-screen flex-col">
    <nav class="navbar hidden bg-base-200 shadow-xs md:flex">
        <div class="navbar-start">
            <a href="/" class="btn btn-ghost text-xl font-heading font-bold text-primary"
                >{APP_NAME}</a>
        </div>

        <div class="navbar-center">
            <ul class="menu menu-horizontal px-1">
                {#each navLinks as link}
                    <li>
                        <a href={link.href} class:menu-active={page.url.pathname === link.href}
                            >{link.label}</a>
                    </li>
                {/each}
            </ul>
        </div>

        <div class="navbar-end gap-2">
            <ThemeToggle />

            {#if data.user}
                <div class="dropdown dropdown-end">
                    <div
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle avatar avatar-placeholder">
                        <div class="w-8 rounded-full bg-primary text-primary-content">
                            <span class="text-sm font-bold"
                                >{getInitials(data.user.name ?? '?')}</span>
                        </div>
                    </div>
                    <ul
                        tabindex="0"
                        class="menu menu-sm dropdown-content mt-3 z-1 p-2 shadow-sm bg-base-100 rounded-box w-52">
                        <li><a href="/profile">Profile</a></li>
                        <li><a href="/register">Register</a></li>
                        {#if data.user.role === 'admin'}
                            <li><a href="/admin">Admin</a></li>
                        {/if}
                        <li><button onclick={handleSignOut}>Sign Out</button></li>
                    </ul>
                </div>
            {:else}
                <a href="/login" class="btn btn-primary btn-sm">Sign In</a>
            {/if}
        </div>
    </nav>

    <main class="flex-1 pb-16 md:pb-0">
        {@render children()}
    </main>

    <footer class="footer footer-center hidden p-4 bg-base-200 text-base-content md:block">
        <aside>
            <p>{APP_NAME} &copy; {new Date().getFullYear()}</p>
            <a href="/changelog" class="text-xs opacity-50 hover:opacity-75">v{__APP_VERSION__}</a>
        </aside>
    </footer>

    <BottomTabBar tabs={mobileTabs} onMenuOpen={handleMenuOpen} />
    <BottomSheet
        open={menuOpen}
        onClose={handleMenuClose}
        menuItems={mobileMenuItems}
        user={data.user}
        onSignOut={handleSignOut} />
</div>
