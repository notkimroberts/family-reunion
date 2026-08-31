<script lang="ts">
import { Printer } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { APP_NAME } from '$lib/general/constants'
import { formatDateRange } from '$lib/utils'
import PaperRegistrationSheet from './PaperRegistrationSheet.svelte'

let { data } = $props()

let dateRange = $derived(
    data.event?.startDate
        ? formatDateRange(
              new Date(data.event.startDate),
              data.event.endDate ? new Date(data.event.endDate) : new Date(data.event.startDate),
          )
        : '',
)

function handlePrint() {
    window.print()
}

/* The PDF's filename. Every browser derives "Save as PDF" from document.title, so the title IS the
   filename — hence no "— {APP_NAME}" suffix on this page, which would land in the saved file as
   "Printable registration form — Patterson Family Reunion.pdf". The year is appended only when the
   event's own title does not already carry it. */
let documentTitle = $derived.by(() => {
    if (!data.event) {
        return `Printable registration form — ${APP_NAME}`
    }
    const year = String(data.event.year)
    const named = data.event.title.includes(year) ? data.event.title : `${data.event.title} ${year}`
    return `${named} Registration`
})
</script>

<svelte:head>
    <title>{documentTitle}</title>
    <!-- Nothing here to index, and a blank form in search results competes with /register. -->
    <meta name="robots" content="noindex" />
</svelte:head>

{#if !data.event}
    <div class="col-span-12">
        <div class="rounded-xl border bg-card px-6 py-12 text-center">
            <p class="text-lg font-semibold">No reunion events are open right now.</p>
            <p class="text-muted-foreground text-sm mt-1">
                There is nothing to print until a reunion is open for registration.
            </p>
        </div>
    </div>
{:else}
    <section class="col-span-12 flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
                <h1>Printable registration form</h1>
                <p class="text-muted-foreground text-sm mt-1">
                    Two pages, sized to be filled in by hand. Print it and hand it to a committee
                    member — or save it as a PDF from the print dialog.
                </p>
            </div>
            <Button onclick={handlePrint}>
                <Printer class="h-4 w-4" />
                Print / Save as PDF
            </Button>
        </div>

        <!-- print:overflow-visible matters: overflow-x-auto is a scroll container, and a scroll
             container CLIPS in print rather than paginating, which took the edges off the sheet. -->
        <div
            class="rounded-xl border shadow-xs overflow-x-auto print:overflow-visible print:border-0 print:shadow-none">
            <PaperRegistrationSheet
                title={data.event.title}
                year={data.event.year}
                {dateRange}
                venueName={data.event.metadata.venue?.name}
                tiers={data.tiers} />
        </div>
    </section>
{/if}
