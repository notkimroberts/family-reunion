<script lang="ts">
import MdiMenu from 'virtual:icons/mdi/menu'
import { authClient } from '$lib/auth-client'
import { ThemeToggle } from '$lib/components'
import { getInitials } from '$lib/utils'

type Props = {
    title: string
    user: { name: string | null; role?: string | null } | null
}

let { title, user }: Props = $props()

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}
</script>

<header class="flex items-center gap-2 lg:gap-4">
    <label for="app-drawer" class="btn btn-square btn-ghost drawer-button lg:hidden">
        <MdiMenu class="h-5 w-5" />
    </label>

    <div class="grow">
        <h1 class="text-lg font-light lg:text-2xl">{title}</h1>
    </div>

    <ThemeToggle size="sm" />

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
                <li><button onclick={handleSignOut}>Sign Out</button></li>
            </ul>
        </div>
    {/if}
</header>
