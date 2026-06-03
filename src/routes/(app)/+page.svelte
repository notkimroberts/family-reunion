<script lang="ts">
import { onMount, onDestroy } from 'svelte'
import { Button } from '$lib/components/ui/button'
import { APP_NAME } from '$lib/general/constants'

let { data } = $props()

let now = $state(Date.now())
let interval: ReturnType<typeof setInterval>

onMount(() => {
    interval = setInterval(() => {
        now = Date.now()
    }, 1000)
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
</script>

<svelte:head>
    <title>{APP_NAME} — Home</title>
    <meta name="description" content="Family reunion — registration, events, and family tree" />
</svelte:head>

<section
    class="col-span-12 flex flex-col justify-center min-h-[calc(100svh-12rem)] md:min-h-[calc(100svh-16rem)]">
    <div class="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
        <!-- Content -->
        <div
            class="flex flex-1 flex-col items-center gap-8 text-center lg:items-start lg:text-left">
            <div class="flex flex-col gap-1">
                <h1>{data.event?.title ?? `${APP_NAME} Family Reunion`}</h1>
                {#if dateRange && eventState !== 'past'}
                    <p class="text-muted-foreground text-lg">{dateRange}</p>
                {/if}
            </div>

            {#if eventState === 'upcoming'}
                <div class="flex gap-6">
                    {#if countdown.withinOneDay}
                        {#each [{ label: 'Days', value: countdown.days }, { label: 'Hours', value: countdown.hours }] as unit}
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-mono text-4xl font-bold tabular-nums lg:text-5xl">
                                    {String(unit.value).padStart(2, '0')}
                                </span>
                                <span
                                    class="text-muted-foreground text-xs uppercase tracking-widest">
                                    {unit.label}
                                </span>
                            </div>
                        {/each}
                    {:else}
                        {#each [{ label: 'Years', value: countdown.years }, { label: 'Months', value: countdown.months }, { label: 'Days', value: countdown.days }].filter((u) => u.value > 0 || u.label === 'Days') as unit}
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-mono text-4xl font-bold tabular-nums lg:text-5xl">
                                    {String(unit.value).padStart(2, '0')}
                                </span>
                                <span
                                    class="text-muted-foreground text-xs uppercase tracking-widest">
                                    {unit.label}
                                </span>
                            </div>
                        {/each}
                    {/if}
                </div>

                <div class="flex flex-col items-center gap-2 lg:items-start">
                    <Button href="/register" size="lg" class="px-10">Register Now</Button>
                    {#if data.registrantCount > 0}
                        <p class="text-muted-foreground text-sm">
                            {data.registrantCount}
                            {data.registrantCount === 1 ? 'family' : 'families'} registered
                        </p>
                    {/if}
                </div>
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

        <!-- Photo -->
        <div class="flex shrink-0 flex-col items-center gap-2">
            <img
                src="/will_and_roxie.png"
                alt="Will and Roxie"
                class="aspect-square w-64 rounded-3xl object-cover shadow-lg lg:w-80" />
            <p class="text-muted-foreground/60 text-xs">Will &amp; Roxie Patterson</p>
        </div>
    </div>
</section>
