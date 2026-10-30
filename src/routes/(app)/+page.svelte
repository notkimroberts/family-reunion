<script lang="ts">
import { ArrowRight, HeartHandshake, Mail } from '@lucide/svelte'
import { onDestroy, onMount } from 'svelte'
import {
    DonationRaisedTotal,
    FamilyRootsCard,
    MerchCards,
    PaymentSafetyNotice,
    RegistrationDeadline,
    ReunionLocations,
    StayConnected,
} from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import {
    APP_NAME,
    CONTACT_EMAIL,
    CONTACT_PHONE,
    DONATION_LEDE,
    DONATION_PRESET_CENTS,
    FACEBOOK_GROUP_URL,
} from '$lib/general/constants'
import { isBeforeRegistrationOpens, isRegistrationClosed } from '$lib/general/registration'
import { paymentSafetyCopyValue } from '$lib/general/scamSafety'
import { formatDateRange, formatPrice, formatReunionDateTime, toE164 } from '$lib/utils'

let { data } = $props()

let now = $state(Date.now())
let interval: ReturnType<typeof setInterval>

/* Filled in only after mount so plain HTML scrapers never see the raw address/number —
   the contact form's spam protections were dropped in favor of showing these directly. */
let contactEmail = $state('')
let contactPhone = $state('')

onMount(() => {
    interval = setInterval(() => {
        now = Date.now()
    }, 1000)
    contactEmail = CONTACT_EMAIL
    contactPhone = CONTACT_PHONE
})

onDestroy(() => {
    if (interval) {
        clearInterval(interval)
    }
})

let eventState = $derived.by(() => {
    if (!data.event?.startDate) {
        return 'no-event' as const
    }
    const start = new Date(data.event.startDate).getTime()
    const end = data.event.endDate ? new Date(data.event.endDate).getTime() : start
    if (now < start) {
        return 'upcoming' as const
    }
    if (now >= start && now <= end) {
        return 'happening' as const
    }
    return 'past' as const
})

/* formatDateRange pins the reunion's zone, so the server and the browser print the same day. */
let dateRange = $derived(
    data.event?.startDate
        ? formatDateRange(
              new Date(data.event.startDate),
              new Date(data.event.endDate ?? data.event.startDate),
          )
        : '',
)

/* Once the lock date passes the Register button leads to a form that refuses; say so here instead.
   Same predicate the server enforces with — and passed `now`, the page's ticking clock, so the
   button and the deadline line under it cannot disagree by a tick. */
let registrationClosed = $derived(
    isRegistrationClosed(data.event?.registrationLockDate ?? null, now),
)
/* Before opening day, the button would lead to a page that only says "come back". The same ticking
   clock, so a visitor who has the page open at the opening minute sees Register Now appear. */
let opensAt = $derived(data.event?.registrationOpensAt ?? null)
let registrationNotYetOpen = $derived(isBeforeRegistrationOpens(opensAt, now))

const FAMILY_STATS = [
    { value: '1819', label: 'Nelly arrives at the Port of New Orleans' },
    { value: '1890', label: 'William & Roxie Married' },
    { value: '15 kids', label: 'Raised together' },
]
</script>

<svelte:head>
    <title>{APP_NAME} — Home</title>
    <meta name="description" content="Family reunion — registration, events, and the program" />
</svelte:head>

<!-- Hero -->
{#if !data.event}
    <section class="col-span-12">
        <div class="bg-card rounded-xl border px-6 py-12 text-center">
            <p class="mb-3 text-4xl">😢</p>
            <p class="text-lg font-semibold">No reunion events are open right now.</p>
            <p class="text-muted-foreground mt-1 text-sm">Check back soon!</p>
        </div>
    </section>
{:else}
    <!-- No card around the hero: the type sits on the page, and Will and Roxie — the couple every
         family here descends from — are two overlapping prints beside it. -->
    <section
        class="col-span-12 grid grid-cols-1 items-center gap-10 pt-2 md:pt-8 lg:grid-cols-2 lg:gap-16">
        <div class="flex flex-col items-start gap-6">
            <div class="flex items-center gap-3">
                <img src="/brand/tree-mark-ink.png" alt="" class="w-12" />
                <p class="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
                    {dateRange} · Oakland, CA
                </p>
            </div>
            <h1 class="text-5xl leading-[1.02] font-bold tracking-tight text-balance md:text-7xl">
                {data.event.title}
            </h1>
            <p class="text-muted-foreground max-w-lg text-lg md:text-xl">
                Descendants of William &amp; Roxie Patterson, married December 26, 1890.
                <a href="#story" class="text-primary font-medium underline underline-offset-4"
                    >Read our family story.</a>
            </p>

            <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
                {#if eventState === 'upcoming'}
                    {#if registrationClosed}
                        <p class="text-sm">
                            Registration is closed. To ask about a late place, contact
                            {#if contactEmail}
                                <a class="underline" href="mailto:{contactEmail}">{contactEmail}</a>
                                or text
                                <a class="underline" href="sms:{toE164(contactPhone)}"
                                    >{contactPhone}</a
                                >.
                            {:else}
                                the reunion organizers.
                            {/if}
                        </p>
                        <!-- Gifts outlive the lock date — see isPublicPath — and this branch is
                             exactly where someone who cannot get a place lands. -->
                        <Button href="/donate" variant="outline" size="lg">
                            <HeartHandshake class="size-4" />
                            Donate instead
                        </Button>
                    {:else if registrationNotYetOpen && opensAt}
                        <p class="text-base">
                            Registration opens
                            <span class="font-semibold"
                                >{formatReunionDateTime(opensAt, 'day')}</span
                            >.
                        </p>
                    {:else}
                        <Button
                            href="/register"
                            size="lg"
                            class="animate-register-pulse h-12 px-8 text-base">
                            Register Now
                            <ArrowRight class="size-4" />
                        </Button>
                    {/if}
                {:else if eventState === 'happening'}
                    <p class="text-2xl font-semibold">It's happening! Enjoy every moment.</p>
                {:else if eventState === 'past'}
                    <p class="text-2xl font-semibold">Thanks for an amazing reunion!</p>
                {/if}
            </div>

            <!-- Outside the eventState branches on purpose: the deadline is the one date a visitor
                 has to act on, so it is stated whatever the reunion's phase. The one exception is
                 before registration opens, when the opening date is the only date that matters. -->
            {#if !registrationNotYetOpen}
                <RegistrationDeadline lockDate={data.event.registrationLockDate} />
            {/if}
        </div>

        <!-- Absolute so the two prints can overlap; the square box reserves their space. -->
        <div class="relative mx-auto aspect-square w-full max-w-md">
            <figure
                class="bg-card absolute top-0 left-0 flex w-[52%] flex-col gap-2 rounded-2xl p-2 shadow-lg">
                <img src="/will_portrait.png" alt="Will Patterson" class="w-full rounded-xl" />
                <figcaption class="px-1 pb-1 text-xs">
                    <span class="font-semibold">Will Patterson</span>
                    <span class="text-muted-foreground">· b. 1869</span>
                </figcaption>
            </figure>
            <figure
                class="bg-card absolute right-0 bottom-0 flex w-[52%] flex-col gap-2 rounded-2xl p-2 shadow-lg">
                <img src="/roxie_portrait.png" alt="Roxie Patterson" class="w-full rounded-xl" />
                <figcaption class="px-1 pb-1 text-xs">
                    <span class="font-semibold">Roxie Patterson</span>
                    <span class="text-muted-foreground">· b. 1872</span>
                </figcaption>
            </figure>
        </div>
    </section>
{/if}

<!-- Every section below is col-span-12 with no max-w of its own: main is already max-w-6xl, and the
     one block of long body copy — Our Family Story — keeps its own max-w-3xl inside its card. -->

<!-- Venue & Hotel. The cards are compact, with map, rates and parking folded away. No top margin:
     the grid's own row gap is enough under a hero with no box around it.
     id="venue" is linked from the confirmation email's parking line. -->
<section id="venue" class="col-span-12 scroll-mt-20">
    <div class="mx-auto mb-8 max-w-xl text-center">
        <h2>Venue &amp; Where to Stay</h2>
        <p class="text-muted-foreground mt-2">
            Both are in Uptown Oakland, a short walk from each other.
        </p>
    </div>
    <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <ReunionLocations />
    </div>
</section>

<!-- Support the Reunion and Get in Touch beside Stay Connected. The preset buttons carry
     their figure to /donate in ?amount=, so a visitor who has already chosen does not choose twice. -->
<div class="col-span-12 mt-8 grid grid-cols-1 gap-8 md:mt-12 md:grid-cols-2 md:gap-6">
    <!-- Left column: giving, then how to reach the organizers. -->
    <div class="flex flex-col gap-8">
        <section id="donate" class="flex scroll-mt-24 flex-col">
            <div class="mx-auto mb-8 max-w-xl text-center">
                <h2>Support the Reunion</h2>
                <p class="text-muted-foreground mt-2">{DONATION_LEDE}</p>
            </div>
            <!-- Sized to its content, not stretched to the Stay Connected column. -->
            <Card>
                <CardContent class="flex flex-col items-center gap-5">
                    <DonationRaisedTotal
                        totalCents={data.raised.totalCents}
                        giftCount={data.raised.giftCount} />
                    <!-- LINKS, not the shared picker: this section must not post. The figure travels
                     to /donate in ?amount= and the picker there receives it. -->
                    <div class="grid w-full grid-cols-2 gap-2">
                        {#each DONATION_PRESET_CENTS as cents (cents)}
                            <Button href="/donate?amount={cents}" variant="outline">
                                ${formatPrice(cents)}
                            </Button>
                        {/each}
                    </div>
                    <Button href="/donate" size="lg" class="w-full sm:w-fit">
                        <HeartHandshake class="size-4" />
                        Donate
                    </Button>
                </CardContent>
            </Card>
        </section>

        <!-- Get in Touch.

         Email is the channel the organizers want, so it is the filled button; the phone is a muted line
         under it. The address is printed too: a mailto: link opens nothing on a desktop with no mail
         client. -->
        <section id="contact" class="flex scroll-mt-24 flex-col">
            <div class="mx-auto mb-8 max-w-xl text-center">
                <h2>Get in Touch</h2>
                <p class="text-muted-foreground mt-2">
                    Have a question about the reunion? Email is the best way to reach the
                    organizers.
                </p>
            </div>
            <Card>
                <CardContent class="flex flex-col items-center gap-4 text-center">
                    {#if contactEmail}
                        <div class="flex w-full flex-col items-center gap-2">
                            <Button href="mailto:{contactEmail}" size="lg" class="w-full sm:w-fit">
                                <Mail class="size-4" />
                                Email the organizers
                            </Button>
                            <p class="text-sm font-medium break-all">{contactEmail}</p>
                        </div>
                    {/if}
                    {#if contactPhone}
                        <p class="text-muted-foreground text-sm">
                            Or text
                            <a class="underline" href="sms:{toE164(contactPhone)}"
                                >{contactPhone}</a>
                        </p>
                    {/if}
                </CardContent>
            </Card>
        </section>
    </div>

    <section class="flex flex-col">
        <div class="mx-auto mb-8 max-w-xl text-center">
            <h2>Stay Connected</h2>
            <p class="text-muted-foreground mt-2">
                Join the family online between now and the reunion.
            </p>
        </div>
        <!-- Not stretched to the gift column's height: a stretched card is empty space. -->
        <div class="flex flex-col gap-6">
            <StayConnected />
            <FamilyRootsCard />
        </div>
    </section>
</div>

<!-- The shirt and the tote, both sold on site and neither part of registration. -->
<section class="col-span-12 mt-8 md:mt-12">
    <div class="mx-auto mb-8 max-w-xl text-center">
        <h2>The Reunion Shirt &amp; Tote</h2>
        <p class="text-muted-foreground mt-2">
            T-shirts and the tote will be available for purchase at the reunion.
        </p>
    </div>
    <MerchCards />
</section>

<!-- The scam notice under a section heading like the rest, so its own heading is turned off. -->
<section class="col-span-12 mt-8 md:mt-12">
    <div class="mx-auto mb-8 max-w-xl text-center">
        <h2>{paymentSafetyCopyValue.heading}</h2>
        <p class="text-muted-foreground mt-2">{paymentSafetyCopyValue.lede}</p>
    </div>
    <PaymentSafetyNotice showHeading={false} />
</section>

<!-- Family Story -->
<section id="story" class="col-span-12 mt-8 mb-8 scroll-mt-24 md:mt-12">
    <div class="bg-card rounded-xl border px-6 py-10 md:px-10 md:py-14">
        <div class="mx-auto max-w-3xl">
            <h2>Our Family Story</h2>

            <div class="mt-6 grid grid-cols-1 gap-4 border-y py-6 sm:grid-cols-3">
                {#each FAMILY_STATS as unit (unit.label)}
                    <div class="flex flex-col items-center gap-1 text-center">
                        <span class="font-mono text-2xl font-bold tabular-nums md:text-3xl">
                            {unit.value}
                        </span>
                        <span class="text-muted-foreground text-xs md:text-sm">
                            {unit.label}
                        </span>
                    </div>
                {/each}
            </div>

            <div class="text-muted-foreground mt-6 space-y-4">
                <p>
                    Our family's story begins with Nelly, a young African woman brought to the Port
                    of New Orleans aboard the brig <em>Planter</em> on February 18, 1819, when she was
                    about twenty years old. Nelly's daughter Caroline was born into slavery under Duncan
                    T. Patterson, an early settler of the city of Kosciusko, and was the mother of eight
                    children — among them Columbus Patterson, born in South Carolina in 1841.
                </p>
                <p>
                    Columbus's son, William S. Patterson, was born in 1869. He married Roxieanna
                    "Roxie" Lee Hawthorne Hickman — born around 1872 to Miss Arteal Hickman and
                    raised by her aunt Gilly Lee and Gilly's husband, Andy Lee — on December 26,
                    1890.
                </p>
                <p>
                    William and Roxie raised fifteen children together: William, Alma, Caroline,
                    Harvey, Columbus, Esau, Henderson, Solomon, Roxie, Hattie, Mary, Katie, Arthur,
                    and Benjamin ("Bennie"). It's their descendants — generations of Pattersons —
                    who gather every reunion to celebrate the family they built.
                </p>
            </div>

            <div class="mt-6">
                <Button
                    href={FACEBOOK_GROUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline">
                    Join the Family Facebook Group →
                </Button>
            </div>
        </div>
    </div>
</section>
