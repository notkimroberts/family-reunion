<script lang="ts">
import { APP_NAME } from '$lib/general/constants'
</script>

<svelte:head>
    <title>{APP_NAME} — Family Reunion</title>
    <meta
        name="description"
        content="Family reunion management — registration, events, and family tree" />
</svelte:head>

<div class="hero min-h-[80vh]">
    <div class="hero-content text-center">
        <div class="max-w-lg">
            <h1 class="text-5xl font-bold text-primary">{APP_NAME}</h1>
            <p class="py-6 text-lg text-base-content/80">
                Bringing our family together, year after year. Register for the next reunion,
                explore the family tree, and relive memories through our photo gallery.
            </p>
            <a href="/login" class="btn btn-primary">Sign In to Get Started</a>
        </div>
    </div>
</div>
