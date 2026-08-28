<script lang="ts">
import { page } from '$app/state'
import { AppHeader, Footer } from '$lib/components'
import { Toaster } from '$lib/components/ui/sonner'
import { cn } from '$lib/utils'

let { children } = $props()

/* Admin is table-heavy — registrations, attendees, users and events all overflow a reading measure,
   and the sidebar takes 13rem of it before content starts. The public pages keep max-w-6xl because
   body copy at 110rem is uncomfortable to read.

   Decided here rather than broken out of in admin/+layout.svelte: escaping a parent's centring needs
   negative margins computed against the viewport, which misbehaves at the boundary and ignores
   scrollbar width. One container, one decision. */
let isAdmin = $derived(page.url.pathname.startsWith('/admin'))
</script>

<div class="min-h-screen flex flex-col">
    <AppHeader />

    <main
        class={cn(
            'mx-auto w-full px-4 py-6 md:px-6 md:py-6 flex-1',
            isAdmin ? 'max-w-[110rem]' : 'max-w-6xl',
        )}>
        <div class="grid grid-cols-12 gap-y-8 md:gap-y-10">
            {@render children()}
        </div>
    </main>

    <Footer />
</div>

<Toaster richColors />
