<script module lang="ts">
import { HOST_HOTEL } from '$lib/general/constants'
import { PAPER_ATTENDEE_ROWS } from './PAPER_ATTENDEE_ROWS'

/* Section numbers, derived rather than written in, because the hotel section renders only when a host
   hotel is listed — hard-coded numbers would leave a sheet reading 1, 2, 4, 5 in that state. The
   contact note also points at the attendee section by number, so there is one source for it. */
const ATTENDEE_SECTION = HOST_HOTEL ? 4 : 3
const AMOUNT_SECTION = ATTENDEE_SECTION + 1

const ATTENDEE_NUMBERS = Array.from({ length: PAPER_ATTENDEE_ROWS }, (_, index) => index + 1)
const SECTION = 'flex break-inside-avoid flex-col gap-1.5'
const SECTION_TITLE = 'text-[10px] font-bold uppercase tracking-widest text-neutral-600'
const NOTE = 'text-[9px] leading-snug text-neutral-600'
</script>

<script lang="ts">
import { APP_DOMAIN, APP_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'
import type { TierOption } from '../types'
import PaperAttendeeBlock from './PaperAttendeeBlock.svelte'
import PaperCheckbox from './PaperCheckbox.svelte'
import PaperField from './PaperField.svelte'

/* The paper form itself: a fixed Letter-width sheet that renders identically on screen and on
   paper, so what an organiser sees before pressing Print is what comes out. It runs to two pages —
   every field is sized for handwriting, and sections carry break-inside-avoid so a page break lands
   between blocks rather than through one. */
let {
    title,
    year,
    dateRange,
    venueName,
    tiers,
}: {
    title: string
    year: number
    dateRange: string
    venueName?: string
    tiers: TierOption[]
} = $props()
</script>

<!-- data-paper-sheet is the hook for the print rules in app.css, which turn these nested flex
     containers into block layout for paper. Chrome ignores break-inside-avoid on a FLEX item, so on
     screen the attendee blocks are flex children and their break rules do nothing — a row split down
     the middle across the page boundary. Block layout is what makes fragmentation obey. -->
<div
    data-paper-sheet
    class="mx-auto flex w-full max-w-[8.5in] flex-col gap-4 bg-white p-[0.4in] text-black print:w-full print:max-w-none print:p-0">
    <!-- flex-wrap and min-w-0: the two header blocks are the widest row on the sheet, and the
         printable width is narrower than the 8.5in the screen renders at. Without these they
         overflowed instead of wrapping, and the print box clipped both top corners. -->
    <header
        class="flex break-inside-avoid flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-black pb-2">
        <div class="flex min-w-0 flex-col gap-0.5">
            <p class="text-[10px] font-semibold tracking-widest text-neutral-600 uppercase">
                {APP_NAME} · {year}
            </p>
            <p class="text-[19px] leading-tight font-bold">{title}</p>
            <p class="text-[10px] text-neutral-600">
                {dateRange}{venueName ? ` · ${venueName}` : ''}
            </p>
        </div>
        <div class="min-w-0 text-right">
            <p class="text-[12px] font-bold tracking-widest uppercase">Registration form</p>
            <p class="{NOTE} break-words">Or register online at {APP_DOMAIN}/register</p>
        </div>
    </header>

    <p class={NOTE}>
        Please print clearly in ink and tick one box in each group. Give the completed form and your
        payment to a reunion committee member. Questions: {CONTACT_EMAIL} or {CONTACT_PHONE}.
    </p>

    <section class={SECTION}>
        <h2 class={SECTION_TITLE}>1 · Who to contact about this registration</h2>
        <div class="grid grid-cols-2 gap-x-5">
            <PaperField label="First name" />
            <PaperField label="Last name" />
        </div>
        <div class="grid grid-cols-[1.4fr_1fr] gap-x-5">
            <PaperField label="Email address" />
            <PaperField label="Phone number" />
        </div>
        <p class={NOTE}>
            The email address is how we send your confirmation and your registration link. Your own
            birth date, T-shirt size and meal choice go on line 1 of section {ATTENDEE_SECTION}.
        </p>
    </section>

    <section class={SECTION}>
        <h2 class={SECTION_TITLE}>2 · Mailing address</h2>
        <div class="grid grid-cols-2 gap-x-5">
            <PaperField label="Street address" />
            <PaperField label="Apartment, suite (if any)" />
        </div>
        <div class="grid grid-cols-[2fr_1fr_1fr] gap-x-5">
            <PaperField label="City" />
            <PaperField label="State" />
            <PaperField label="ZIP code" />
        </div>
        <p class={NOTE}>
            If anyone in your party lives at a different address, write their name and address on
            the back of this sheet.
        </p>
    </section>

    <!-- One question for the whole booking, not per attendee: a household books rooms together.
         Renders nothing when no host hotel is listed, like every other HOST_HOTEL reader. -->
    {#if HOST_HOTEL}
        <section class={SECTION}>
            <h2 class={SECTION_TITLE}>3 · Where your party will stay</h2>
            <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <span class="text-[10px] font-semibold">
                    Will your party stay at {HOST_HOTEL.name}?
                </span>
                <PaperCheckbox label="Yes" />
                <PaperCheckbox label="No, somewhere else" />
                <PaperCheckbox label="Not sure yet" />
            </div>
            <p class={NOTE}>
                {HOST_HOTEL.name} is half a block from the reunion. Your answer tells us how many rooms
                to secure, so please tick a box even if you are not certain.
            </p>
        </section>
    {/if}

    <!-- A page of its own. Five hand-writable blocks do not fit under the contact and address
         sections, so the section began mid-page and the block straddling the boundary was cut in
         half. Starting it on a fresh page keeps every row whole and puts all five together. -->
    <section class="flex break-before-page flex-col gap-2">
        <h2 class={SECTION_TITLE}>
            {ATTENDEE_SECTION} · Everyone attending — write yourself on line 1 (up to {PAPER_ATTENDEE_ROWS}
            people)
        </h2>
        {#each ATTENDEE_NUMBERS as attendeeNumber (attendeeNumber)}
            <PaperAttendeeBlock index={attendeeNumber} {tiers} isContact={attendeeNumber === 1} />
        {/each}
        <p class={NOTE}>
            "At the 2025 reunion" means that person attended the 2025 New Orleans reunion. More than
            {PAPER_ATTENDEE_ROWS} people: use a second copy of this form.
        </p>
    </section>

    <section class={SECTION}>
        <h2 class={SECTION_TITLE}>{AMOUNT_SECTION} · Amount due</h2>
        <div class="flex items-end justify-between gap-6">
            <ul class="flex flex-wrap gap-x-5 gap-y-0.5 text-[10px]">
                {#each tiers as tier (tier.id)}
                    <li>
                        <span class="font-semibold">{tier.label}</span>
                        · ${formatPrice(tier.priceCents)} per person
                    </li>
                {/each}
            </ul>
            <div class="flex items-end gap-2 whitespace-nowrap">
                <span class="text-[11px] font-bold tracking-widest uppercase">Total enclosed</span>
                <span class="text-[13px] font-bold">$</span>
                <span class="inline-block h-8.5 w-32 border-b-2 border-black"></span>
            </div>
        </div>
    </section>

    <section class="flex break-inside-avoid items-end gap-6 border-t border-neutral-400 pt-2">
        <div class="grid flex-1 grid-cols-[2fr_1fr] gap-x-5">
            <PaperField label="Signature" />
            <PaperField label="Date" />
        </div>
        <div class="w-[2.6in] border border-dashed border-neutral-500 px-2 py-1">
            <p class="text-[9px] font-semibold tracking-widest text-neutral-500 uppercase">
                Committee use only
            </p>
            <div class="grid grid-cols-2 gap-x-4">
                <PaperField label="Received by" />
                <PaperField label="Entered on" />
            </div>
        </div>
    </section>
</div>
