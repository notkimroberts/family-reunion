<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'
import { APP_NAME } from '$lib/general/constants'

let { data } = $props()
</script>

<PageTitle title="Shop" />

<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">{APP_NAME} Shop</h1>

    {#if !data.config}
        <div class="text-center py-12">
            <p class="text-base-content/60 text-lg">The shop is not currently available.</p>
        </div>
    {:else}
        <p class="text-lg text-base-content/70 mb-8">
            Get your reunion gear! Hats, t-shirts, and more.
        </p>

        {#if data.config.products && data.config.products.length > 0}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                {#each data.config.products as product}
                    <div class="card bg-base-100 shadow-md">
                        {#if product.imageUrl}
                            <figure>
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    class="w-full h-48 object-cover" />
                            </figure>
                        {/if}
                        <div class="card-body">
                            <h3 class="card-title text-base">{product.name}</h3>
                            {#if product.description}
                                <p class="text-sm text-base-content/60">{product.description}</p>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="text-center">
            <a
                href={data.config.externalShopUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary btn-lg">
                Shop Now &rarr;
            </a>
        </div>
    {/if}
</div>
