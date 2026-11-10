<script lang="ts">
import { Mail } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import {
    APP_NAME,
    CHECK_PAYEE,
    CONTACT_EMAIL,
    CONTACT_PHONE,
    MAILING_ADDRESS,
} from '$lib/general/constants'
import { toE164 } from '$lib/utils'
import HelpQuestions from './HelpQuestions.svelte'
import PaymentQuestions from './PaymentQuestions.svelte'
import RegistrationQuestions from './RegistrationQuestions.svelte'
import TravelQuestions from './TravelQuestions.svelte'
import WeekendQuestions from './WeekendQuestions.svelte'

// Jump-bar order is page order; ids match each FaqSection
const SECTION_LINKS = [
    { id: 'registration', label: 'Registration' },
    { id: 'paying', label: 'Paying' },
    { id: 'weekend', label: 'The weekend' },
    { id: 'travel', label: 'Travel' },
    { id: 'help', label: 'Photos & help' },
]

let { data } = $props()
</script>

<svelte:head>
    <title>{APP_NAME} — FAQ</title>
    <meta
        name="description"
        content="Answers to common questions about the Patterson Family Reunion: registration, prices, the host hotel, travel and how to pay." />
</svelte:head>

<!-- One reading column, centered. Every answer is open: the page is read top to bottom on a phone,
     and the jump bar is how a reader skips ahead. -->
<div class="col-span-12 flex justify-center">
    <div class="flex w-full max-w-2xl flex-col gap-10 md:gap-12">
        <header class="flex flex-col gap-4 pt-2 md:pt-8">
            <div class="flex items-center gap-3">
                <img src="/brand/tree-mark-ink.png" alt="" class="w-10" />
                <p class="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
                    Questions &amp; answers
                </p>
            </div>
            <h1>Frequently asked questions</h1>
            <p class="text-muted-foreground text-lg">
                The questions families ask us most. If yours is not here, ask the organizers.
            </p>
        </header>

        <!-- Sticky under the site header (h-16 on mobile, h-20 from md). Scrolls sideways on a narrow
             screen rather than wrapping to two rows of chips. -->
        <nav
            aria-label="FAQ sections"
            class="bg-background/90 sticky top-16 z-20 border-b py-3 backdrop-blur-md md:top-20">
            <ul class="flex [scrollbar-width:none] gap-2 overflow-x-auto">
                {#each SECTION_LINKS as link (link.id)}
                    <li class="shrink-0">
                        <a
                            href="#{link.id}"
                            class="bg-card text-foreground hover:bg-muted flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors">
                            {link.label}
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>

        <RegistrationQuestions tiers={data.tiers} lockDate={data.event?.registrationLockDate} />
        <PaymentQuestions />
        <WeekendQuestions startDate={data.event?.startDate} endDate={data.event?.endDate} />
        <TravelQuestions />
        <HelpQuestions />

        <!-- The way out for a question the page does not answer. -->
        <section
            class="bg-card mb-8 flex flex-col items-center gap-4 rounded-2xl border px-6 py-8 text-center">
            <h2>Still have a question?</h2>
            <p class="text-muted-foreground">The organizers are happy to help.</p>
            <div class="flex w-full flex-col items-center gap-2">
                <Button href="mailto:{CONTACT_EMAIL}" size="lg" class="w-full sm:w-fit">
                    <Mail class="size-4" />
                    Email the organizers
                </Button>
                <p class="text-sm font-medium wrap-anywhere">{CONTACT_EMAIL}</p>
            </div>
            <p class="text-muted-foreground text-sm">
                Or text
                <a class="underline" href="sms:{toE164(CONTACT_PHONE)}">{CONTACT_PHONE}</a>
            </p>
            <p class="text-muted-foreground text-sm">
                Or write to {CHECK_PAYEE}, {MAILING_ADDRESS}
            </p>
        </section>
    </div>
</div>
