<script lang="ts">
import { page } from '$app/state'
import { AppHeader, Footer } from '$lib/components'
import { Toaster } from '$lib/components/ui/sonner'
import { TooltipProvider } from '$lib/components/ui/tooltip'
import { APP_NAME } from '$lib/general/constants'
import { cn } from '$lib/utils'

let { children } = $props()

/* Admin is table-heavy — registrations, people, users and events all overflow a reading measure,
   and the sidebar takes 13rem of it before content starts. The public pages keep max-w-6xl because
   body copy at 110rem is uncomfortable to read.

   Decided here rather than broken out of in admin/+layout.svelte: escaping a parent's centring needs
   negative margins computed against the viewport, which misbehaves at the boundary and ignores
   scrollbar width. One container, one decision. */
let isAdmin = $derived(page.url.pathname.startsWith('/admin'))

/* THE SHARE CARD. Without these tags a scraper picks whatever it likes off the page, which meant a text
   of the invite arrived showing an empty photograph of the venue's lobby — a link to the reunion that
   looked like a link to a building.

   Will and Roxie are the couple the reunion descends from, and their portrait is already the site's
   avatar and its favicon; the share card is the same identity in a third place, not a new asset. Not
   will_and_roxie.jpg, which is a collage including their headstone: correct for the history section,
   wrong on an invitation.

   ABSOLUTE URLs, built from the request origin. Facebook, iMessage and Slack all discard a relative
   og:image, and using APP_DOMAIN instead would make every staging and preview deploy advertise
   production — the origin is what the reader actually asked for. */
const shareImage = $derived(`${page.url.origin}/will_and_roxie.png`)
const shareUrl = $derived(page.url.href)
</script>

<!-- Site-wide, in the layout, so every page a relative shares carries the card — the pages that matter
     for sharing are / and /register, and each still sets its own <title> and description. og:title is
     deliberately omitted here for that reason: a page's own <title> is what a scraper falls back to, so
     naming it once here would overwrite all of them with one string. -->
<svelte:head>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={APP_NAME} />
    <meta property="og:url" content={shareUrl} />
    <meta property="og:image" content={shareImage} />
    <meta property="og:image:alt" content="Will and Roxie Patterson" />
    <!-- 'summary', not 'summary_large_image': the portrait is a square 346px scan of a photograph from
         the 1800s, and a card that stretches it across the full width would upscale it into mush. -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content={shareImage} />
</svelte:head>

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
