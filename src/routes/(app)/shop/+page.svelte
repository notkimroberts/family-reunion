<script lang="ts">
import { APP_NAME } from '$lib/general/constants'

let { data } = $props()
</script>

{#if !data.config}
    <section class="col-span-12 text-center py-12">
        <p class="text-base-content/60 text-lg">The shop is not currently available.</p>
    </section>
{:else}
    <section class="col-span-12">
        <p class="text-base-content/70">Get your reunion gear! Hats, t-shirts, and more.</p>
    </section>

    {#if data.config.products && data.config.products.length > 0}
        <section class="col-span-12">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {#each data.config.products as product}
                    <div class="card bg-base-100 shadow-xs">
                        {#if product.imageUrl}
                            <figure>
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    class="w-full aspect-square object-cover" />
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
        </section>
    {/if}

    <section class="col-span-12 text-center">
        <a
            href={data.config.externalShopUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-lg">
            Shop Now &rarr;
        </a>
    </section>
{/if}
