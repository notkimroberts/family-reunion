<script lang="ts">
import { enhance } from '$app/forms'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'

let { data, form } = $props()
</script>

<svelte:head>
    <title>Storefront Settings — Admin</title>
</svelte:head>

<section class="col-span-12">
    <h1 class="text-2xl font-bold">Storefront</h1>
</section>

{#if form?.success}
    <div class="col-span-12">
        <Alert>
            <AlertDescription>Saved!</AlertDescription>
        </Alert>
    </div>
{/if}
{#if form?.error}
    <div class="col-span-12">
        <Alert variant="destructive">
            <AlertDescription>{form.error}</AlertDescription>
        </Alert>
    </div>
{/if}

<section class="col-span-12 xl:col-span-8">
    <Card>
        <CardHeader>
            <CardTitle>Storefront Settings</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-4">
                <div class="space-y-2">
                    <label for="externalShopUrl" class="text-sm font-medium"
                        >External Shop URL</label>
                    <Input
                        id="externalShopUrl"
                        name="externalShopUrl"
                        type="url"
                        value={data.config?.externalShopUrl ?? ''}
                        placeholder="https://your-shop.com"
                        required />
                </div>

                <div class="flex items-center justify-between py-2">
                    <label for="isActive" class="text-sm font-medium">Shop page visible</label>
                    <input
                        id="isActive"
                        name="isActive"
                        type="checkbox"
                        class="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        checked={data.config?.isActive ?? true} />
                </div>

                <div class="space-y-2">
                    <label for="products" class="text-sm font-medium"
                        >Product Previews (JSON array)</label>
                    <p class="text-xs text-muted-foreground">
                        [{`{"name":"Reunion Tee","imageUrl":"...","description":"..."}`}]
                    </p>
                    <Textarea
                        id="products"
                        name="products"
                        class="h-32"
                        value={data.config?.products
                            ? JSON.stringify(data.config.products, null, 2)
                            : ''} />
                </div>

                <Button type="submit">Save Settings</Button>
            </form>
        </CardContent>
    </Card>
</section>
