<script lang="ts">
import { Mail, MessageSquare } from '@lucide/svelte'
import { onMount, onDestroy } from 'svelte'
import { StayConnected, ReunionLocations } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE, FACEBOOK_GROUP_URL } from '$lib/general/constants'

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

let countdown = $derived.by(() => {
    if (!data.event?.startDate || eventState !== 'upcoming') {
        return { years: 0, months: 0, days: 0, hours: 0, withinOneDay: false }
    }

    const nowDate = new Date(now)
    const startDate = new Date(data.event.startDate)
    const nowMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
    const startMidnight = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
    )
    const totalDays = Math.round(
        (startMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24),
    )
    const withinOneDay = totalDays <= 1

    if (withinOneDay) {
        const hours = Math.floor((startDate.getTime() - now) / (1000 * 60 * 60))
        return { years: 0, months: 0, days: totalDays, hours, withinOneDay: true }
    }

    let months =
        (startDate.getFullYear() - nowDate.getFullYear()) * 12 +
        (startDate.getMonth() - nowDate.getMonth())
    const dateAfterMonths = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth() + months,
        nowDate.getDate(),
    )
    if (dateAfterMonths > startMidnight) {
        months--
    }
    const baseDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + months, nowDate.getDate())
    const days = Math.round((startMidnight.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    return { years, months: remainingMonths, days, hours: 0, withinOneDay: false }
})

let dateRange = $derived.by(() => {
    if (!data.event?.startDate) {
        return ''
    }
    const start = new Date(data.event.startDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
    })
    const end = new Date(data.event.endDate ?? data.event.startDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
    return `${start} – ${end}`
})

let totalMonths = $derived(countdown.years * 12 + countdown.months)

const FAMILY_STATS = [
    { value: '1819', label: 'Nelly arrives at the Port of New Orleans' },
    { value: '1890', label: 'William & Roxie Married' },
    { value: '15 kids', label: 'Raised together' },
]
</script>

<svelte:head>
    <title>{APP_NAME} — Home</title>
    <meta name="description" content="Family reunion — registration, events, and family tree" />
</svelte:head>

<!-- Hero -->
{#if !data.event}
    <section class="col-span-12">
        <div class="rounded-xl border bg-card px-6 py-12 text-center">
            <p class="text-4xl mb-3">😢</p>
            <p class="text-lg font-semibold">No reunion events are open right now.</p>
            <p class="text-muted-foreground text-sm mt-1">Check back soon!</p>
        </div>
    </section>
{:else}
    <section class="col-span-12">
        <div class="rounded-xl border bg-card p-4 md:p-6">
            <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-center">
                <!-- Framed portraits -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-2 rounded-md bg-background p-3 shadow-sm">
                        <img
                            src="/will_portrait.png"
                            alt="Will Patterson"
                            class="w-full rounded-sm" />
                        <div class="text-center">
                            <p class="text-sm font-medium">Will Patterson</p>
                            <p class="text-muted-foreground text-xs">b. 1869</p>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 rounded-md bg-background p-3 shadow-sm">
                        <img
                            src="/roxie_portrait.png"
                            alt="Roxie Patterson"
                            class="w-full rounded-sm" />
                        <div class="text-center">
                            <p class="text-sm font-medium">Roxie Patterson</p>
                            <p class="text-muted-foreground text-xs">b. 1872</p>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="flex flex-col gap-4 text-center lg:text-left">
                    <h1 class="text-4xl font-bold tracking-tight md:text-6xl">
                        {data.event.title}
                    </h1>

                    {#if dateRange && eventState !== 'past'}
                        <p class="text-muted-foreground text-lg">{dateRange}</p>
                    {/if}

                    {#if eventState === 'upcoming'}
                        <p class="text-2xl font-bold tabular-nums">
                            {#if countdown.withinOneDay}
                                {countdown.days}
                                {countdown.days === 1 ? 'day' : 'days'}, {countdown.hours}
                                {countdown.hours === 1 ? 'hour' : 'hours'} until we gather
                            {:else if totalMonths > 0}
                                {totalMonths}
                                {totalMonths === 1 ? 'month' : 'months'} until we gather
                            {:else}
                                {countdown.days}
                                {countdown.days === 1 ? 'day' : 'days'} until we gather
                            {/if}
                        </p>

                        <div
                            class="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                            <Button
                                href="/register"
                                size="lg"
                                class="px-14 py-7 text-lg transition-transform duration-150 hover:scale-[1.03]">
                                Register Now
                            </Button>
                        </div>
                        {#if data.registrantCount > 0}
                            <p class="text-muted-foreground text-sm">
                                Join {data.registrantCount}
                                {data.registrantCount === 1 ? 'person' : 'people'} already registered
                            </p>
                        {/if}
                    {:else if eventState === 'happening'}
                        <div>
                            <p class="text-primary mb-2 text-3xl font-bold">It's happening!</p>
                            <p class="text-muted-foreground">Enjoy every moment with the family.</p>
                        </div>
                    {:else if eventState === 'past'}
                        <div>
                            <p class="mb-4 text-2xl font-bold">Thanks for an amazing reunion!</p>
                            <Button href="/gallery" size="lg">View Photos</Button>
                        </div>
                    {:else}
                        <p class="text-muted-foreground">Stay tuned for the next reunion!</p>
                    {/if}
                </div>
            </div>
        </div>
    </section>
{/if}

<!-- Family Story -->
<section class="col-span-12 mt-8 md:mt-12">
    <div class="rounded-xl border bg-card px-6 py-10 md:px-10 md:py-14">
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

            <div class="mt-6 space-y-4 text-muted-foreground">
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

<!-- Venue & Hotel -->
<section class="col-span-12 mt-8 md:mt-12">
    <div class="text-center max-w-xl mx-auto mb-8">
        <h2>Venue &amp; Where to Stay</h2>
        <p class="text-muted-foreground mt-2">
            Both are in Uptown Oakland, a short walk from each other.
        </p>
    </div>
    <div class="grid grid-cols-1 gap-6 max-w-5xl mx-auto md:grid-cols-2">
        <ReunionLocations />
    </div>
</section>

<!-- Stay Connected -->
<section class="col-span-12 mt-8 md:mt-12">
    <div class="text-center max-w-xl mx-auto mb-8">
        <h2>Stay Connected</h2>
        <p class="text-muted-foreground mt-2">
            Join the family online between now and the reunion.
        </p>
    </div>
    <div class="grid grid-cols-1 gap-6 max-w-3xl mx-auto md:grid-cols-2">
        <StayConnected />
    </div>
</section>

<!-- Get in Touch -->
<section id="contact" class="col-span-12 mt-8 mb-8 scroll-mt-24 md:mt-12">
    <div class="text-center max-w-xl mx-auto mb-8">
        <h2>Get in Touch</h2>
        <p class="text-muted-foreground mt-2">
            Have a question about the reunion? Reach the organizers directly below.
        </p>
    </div>
    <Card class="max-w-2xl mx-auto">
        <CardContent class="pt-6">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {#if contactEmail}
                    <a href="mailto:{contactEmail}" class="flex items-center gap-3 group">
                        <div
                            class="rounded-md bg-primary/10 p-2 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Mail class="h-4 w-4" />
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">Email</p>
                            <p class="text-sm font-medium group-hover:underline">
                                {contactEmail}
                            </p>
                        </div>
                    </a>
                {/if}
                {#if contactPhone}
                    <a
                        href="sms:{contactPhone.replace(/[^\d+]/g, '')}"
                        class="flex items-center gap-3 group">
                        <div
                            class="rounded-md bg-primary/10 p-2 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                            <MessageSquare class="h-4 w-4" />
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">Text</p>
                            <p class="text-sm font-medium group-hover:underline">
                                {contactPhone}
                            </p>
                        </div>
                    </a>
                {/if}
            </div>
        </CardContent>
    </Card>
</section>
