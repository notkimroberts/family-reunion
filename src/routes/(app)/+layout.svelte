<script lang="ts">
import { page } from '$app/state'
import { AppHeader, Footer } from '$lib/components'
import { Toaster } from '$lib/components/ui/sonner'
import { TooltipProvider } from '$lib/components/ui/tooltip'
import { cn } from '$lib/utils'

let { children } = $props()

/* Admin is table-heavy — registrations, people, users and events all overflow a reading measure,
   and the sidebar takes 13rem of it before content starts. The public pages keep max-w-6xl because
   body copy at 110rem is uncomfortable to read.

   Decided here rather than broken out of in admin/+layout.svelte: escaping a parent's centring needs
   negative margins computed against the viewport, which misbehaves at the boundary and ignores
   scrollbar width. One container, one decision. */
let isAdmin = $derived(page.url.pathname.startsWith('/admin'))
</script>

<!-- TooltipProvider wraps everything: bits-ui's Tooltip.Root throws without one as an ancestor, and it
     renders no markup of its own. -->
<TooltipProvider>
    <div class="flex min-h-screen flex-col">
        <AppHeader />

        <main
            class={cn(
                'mx-auto w-full flex-1 px-4 py-6 md:px-6 md:py-6',
                isAdmin ? 'max-w-[110rem]' : 'max-w-6xl',
            )}>
            <div class="grid grid-cols-12 gap-y-8 md:gap-y-10">
                {@render children()}
            </div>
        </main>

        <Footer />
    </div>
</TooltipProvider>

<Toaster richColors closeButton />
