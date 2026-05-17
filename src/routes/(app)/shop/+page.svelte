<script lang="ts">
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { APP_NAME } from '$lib/general/constants'

let { data } = $props()
</script>

<svelte:head>
    <title>Shop — {APP_NAME}</title>
</svelte:head>

{#if !data.config}
    <section class="col-span-12 text-center py-12">
        <p class="text-muted-foreground text-lg">The shop is not currently available.</p>
    </section>
{:else}
    <section class="col-span-12">
        <p class="text-muted-foreground">Get your reunion gear! Hats, t-shirts, and more.</p>
    </section>

    {#if data.config.products && data.config.products.length > 0}
        <section class="col-span-12">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {#each data.config.products as product}
                    <Card>
                        {#if product.imageUrl}
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                class="w-full aspect-square object-cover rounded-t-lg" />
                        {/if}
                        <CardContent class="pt-4">
                            <h3 class="font-semibold text-base">{product.name}</h3>
                            {#if product.description}
                                <p class="text-sm text-muted-foreground mt-1">
                                    {product.description}
                                </p>
                            {/if}
                        </CardContent>
                    </Card>
                {/each}
            </div>
        </section>
    {/if}

    <section class="col-span-12 text-center">
        <Button
            href={data.config.externalShopUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="lg">
            Shop Now &rarr;
        </Button>
    </section>
{/if}
