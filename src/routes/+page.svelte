<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'
import { APP_NAME } from '$lib/general/constants'

let { data } = $props()
</script>

<PageTitle />
<svelte:head>
    <meta
        name="description"
        content="Family reunion management — registration, events, and family tree" />
</svelte:head>

<div class="hero min-h-[60vh] bg-base-100">
    <div class="hero-content text-center">
        <div class="max-w-lg">
            <h1 class="text-5xl font-bold text-primary">{APP_NAME}</h1>
            <p class="py-6 text-lg">
                Bringing our family together, year after year. Register for the next reunion,
                explore the family tree, and relive memories through our photo gallery.
            </p>
            <div class="flex gap-4 justify-center flex-wrap">
                {#if data.user}
                    <a href="/register" class="btn btn-primary">Register for Reunion</a>
                    <a href="/program" class="btn btn-secondary">View Program</a>
                {:else}
                    <a href="/login" class="btn btn-primary">Sign In to Get Started</a>
                {/if}
            </div>
        </div>
    </div>
</div>

<div class="py-16 px-4 bg-base-200">
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="card bg-base-100 shadow-md">
            <div class="card-body items-center text-center">
                <div class="text-4xl mb-2">🎉</div>
                <h2 class="card-title">Register</h2>
                <p>
                    Sign up your household for the next family reunion and pay the registration fee
                    online.
                </p>
            </div>
        </div>
        <div class="card bg-base-100 shadow-md">
            <div class="card-body items-center text-center">
                <div class="text-4xl mb-2">🌳</div>
                <h2 class="card-title">Family Tree</h2>
                <p>Explore our growing family tree and see how everyone is connected.</p>
            </div>
        </div>
        <div class="card bg-base-100 shadow-md">
            <div class="card-body items-center text-center">
                <div class="text-4xl mb-2">📸</div>
                <h2 class="card-title">Gallery</h2>
                <p>Browse and share photos from past and present reunions.</p>
            </div>
        </div>
    </div>
</div>
