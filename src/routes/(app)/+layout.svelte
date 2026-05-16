<script lang="ts">
import { page } from '$app/state'
import { AppHeader, BottomSheet, BottomTabBar, Footer } from '$lib/components'

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
let sheetOpen = $state(false)
</script>

<div class="min-h-screen bg-base-200 flex flex-col">
    <AppHeader title={currentTitle} user={data.user} {isAdmin} />

    <main class="mx-auto max-w-6xl w-full px-4 py-6 pb-24 md:px-6 md:py-10 md:pb-10 flex-1">
        <div class="grid grid-cols-12 gap-y-8 md:gap-y-10">
            {@render children()}
        </div>
    </main>

    <Footer />

    <BottomTabBar onMoreClick={() => (sheetOpen = true)} />
    <BottomSheet open={sheetOpen} user={data.user} {isAdmin} onClose={() => (sheetOpen = false)} />
</div>
