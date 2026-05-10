<script lang="ts">
import { onMount, onDestroy } from 'svelte'
import { APP_NAME } from '$lib/general/constants'
import { formatPrice } from '$lib/utils'

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
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    const diff = new Date(data.event.startDate).getTime() - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, minutes, seconds }
})
</script>

<svelte:head>
    <title>{APP_NAME} — Home</title>
    <meta
        name="description"
        content="Family reunion management — registration, events, and family tree" />
</svelte:head>

<!-- Hero with background image -->
<section class="col-span-12 -m-4 lg:-m-10 mb-0 relative overflow-hidden rounded-b-box">
    <div class="absolute inset-0">
        <img src="/pfr25.png" alt="" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30"></div>
    </div>

    <div class="relative z-10 px-6 py-16 lg:px-16 lg:py-24 text-center text-white">
        <h1 class="text-4xl lg:text-5xl font-bold font-heading mb-4">
            {data.event?.title ?? `${APP_NAME} Family Reunion`}
        </h1>

        {#if eventState === 'upcoming' && data.event?.startDate}
            <p class="text-lg text-white/80 mb-8">
                {new Date(data.event.startDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                })} – {new Date(data.event.endDate ?? data.event.startDate).toLocaleDateString(
                    'en-US',
                    { month: 'long', day: 'numeric', year: 'numeric' },
                )}
            </p>

            <!-- Countdown -->
            <div class="flex justify-center gap-4 lg:gap-8 mb-10">
                <div class="flex flex-col items-center">
                    <span class="text-4xl lg:text-6xl font-bold tabular-nums">
                        {countdown.days}
                    </span>
                    <span class="text-xs lg:text-sm text-white/70 uppercase tracking-wide"
                        >Days</span>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-4xl lg:text-6xl font-bold tabular-nums">
                        {countdown.hours}
                    </span>
                    <span class="text-xs lg:text-sm text-white/70 uppercase tracking-wide"
                        >Hours</span>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-4xl lg:text-6xl font-bold tabular-nums">
                        {countdown.minutes}
                    </span>
                    <span class="text-xs lg:text-sm text-white/70 uppercase tracking-wide"
                        >Mins</span>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-4xl lg:text-6xl font-bold tabular-nums">
                        {countdown.seconds}
                    </span>
                    <span class="text-xs lg:text-sm text-white/70 uppercase tracking-wide"
                        >Secs</span>
                </div>
            </div>

            <a href="/register" class="btn btn-primary btn-lg shadow-lg">Register Now</a>
            <div class="mt-3">
                <a href="/program" class="text-sm text-white/70 hover:text-white link-hover">
                    View full program &rarr;
                </a>
            </div>
        {:else if eventState === 'happening'}
            <p class="text-2xl lg:text-3xl font-bold text-primary-content mb-4">Happening Now!</p>
            <p class="text-lg text-white/80">Enjoy every moment with the family.</p>
        {:else if eventState === 'past'}
            <p class="text-2xl lg:text-3xl font-bold mb-4">Thanks for an amazing reunion!</p>
            <a href="/gallery" class="btn btn-primary btn-lg shadow-lg">View Photos</a>
        {:else}
            <p class="text-lg text-white/80">Stay tuned for the next reunion!</p>
        {/if}
    </div>
</section>

<!-- Stats + Pricing -->
{#if data.event && eventState === 'upcoming'}
    <section
        class="stats stats-vertical md:stats-horizontal bg-base-100 col-span-12 w-full shadow-xs">
        <div class="stat">
            <div class="stat-title">Families Registered</div>
            <div class="stat-value text-primary">{data.registrantCount}</div>
            <div class="stat-desc">and counting!</div>
        </div>

        {#if data.tiers.length > 0}
            <div class="stat">
                <div class="stat-title">Pricing</div>
                <div class="stat-value text-sm font-normal space-y-1">
                    {#each data.tiers as tier}
                        <div class="flex justify-between gap-4">
                            <span class="text-base-content/70">
                                {tier.label} ({tier.minAge}{tier.maxAge
                                    ? `–${tier.maxAge}`
                                    : '+'})</span>
                            <span class="font-semibold">${formatPrice(tier.priceCents)}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </section>
{/if}

<!-- Venue Teaser -->
{#if data.event?.venue && eventState === 'upcoming'}
    <section class="card bg-base-100 col-span-12 shadow-xs overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-2">
            {#if data.event.venue.imageUrl}
                <figure class="max-lg:h-48 lg:h-full">
                    <img
                        src={data.event.venue.imageUrl}
                        alt={data.event.venue.name}
                        class="w-full h-full object-cover" />
                </figure>
            {/if}
            <div class="card-body">
                <h2 class="card-title">The Venue</h2>
                <p class="text-xl font-semibold">{data.event.venue.name}</p>
                <p class="text-base-content/70">{data.event.venue.address}</p>
                {#if data.event.venue.description}
                    <p class="mt-2 text-sm">{data.event.venue.description}</p>
                {/if}
                <div class="card-actions mt-4">
                    <a href="/program" class="btn btn-ghost btn-sm">See full program &rarr;</a>
                </div>
            </div>
        </div>
    </section>
{/if}
