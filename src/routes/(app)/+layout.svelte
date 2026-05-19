<script lang="ts">
import { AppHeader, Footer } from '$lib/components'
import { Toaster } from '$lib/components/ui/sonner'

let { children, data } = $props()

let isAdmin = $derived(data.user?.role === 'admin')
</script>

<div class="min-h-screen bg-base-200 flex flex-col">
    <AppHeader user={data.user} {isAdmin} />

    <main class="mx-auto max-w-6xl w-full px-4 py-6 md:px-6 md:py-6 flex-1">
        <div class="grid grid-cols-12 gap-y-8 md:gap-y-10">
            {@render children()}
        </div>
    </main>

    <Footer />
</div>

<Toaster richColors />
