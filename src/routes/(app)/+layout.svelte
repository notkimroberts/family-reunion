<script lang="ts">
import { page } from '$app/state'
import AppHeader from '$lib/components/AppHeader.svelte'
import Sidebar from '$lib/components/Sidebar.svelte'

let { children, data } = $props()

const pageTitles: Record<string, string> = {
    '/': 'Home',
    '/gallery': 'Gallery',
    '/gallery/upload': 'Upload Photos',
    '/family-tree': 'Family Tree',
    '/members': 'Members',
    '/program': 'Program',
    '/shop': 'Shop',
    '/register': 'Register',
    '/register/confirmation': 'Registration Confirmed',
    '/contact': 'Contact',
    '/profile': 'Profile',
    '/profile/relationships': 'Relationships',
    '/changelog': 'Changelog',
    '/admin': 'Admin',
    '/admin/events': 'Events',
    '/admin/users': 'Users',
    '/admin/photos': 'Photos',
    '/admin/storefront': 'Storefront',
}

let currentTitle = $derived(pageTitles[page.url.pathname] ?? 'Home')
let isAdmin = $derived(data.user?.role === 'admin')
</script>

<div class="drawer bg-base-200 lg:drawer-open min-h-screen">
    <input id="app-drawer" type="checkbox" class="drawer-toggle" />

    <main class="drawer-content">
        <div class="grid grid-cols-12 grid-rows-[min-content] gap-y-12 p-4 lg:gap-x-12 lg:p-10">
            <div class="col-span-12">
                <AppHeader title={currentTitle} user={data.user} />
            </div>
            {@render children()}
        </div>
    </main>

    <aside class="drawer-side z-10">
        <label for="app-drawer" class="drawer-overlay"></label>
        <Sidebar {isAdmin} />
    </aside>
</div>
