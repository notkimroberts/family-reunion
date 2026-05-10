<script lang="ts">
import { enhance } from '$app/forms'

let { data, form } = $props()
</script>

<svelte:head>
    <title>Storefront Settings — Admin</title>
</svelte:head>

{#if form?.success}
    <div class="alert alert-success col-span-12"><span>Saved!</span></div>
{/if}
{#if form?.error}
    <div class="alert alert-error col-span-12"><span>{form.error}</span></div>
{/if}

<section class="card bg-base-100 col-span-12 xl:col-span-8 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Storefront Settings</h2>
        <form method="POST" use:enhance class="space-y-4">
            <fieldset class="fieldset w-full">
                <label class="label">External Shop URL</label>
                <input
                    name="externalShopUrl"
                    type="url"
                    class="input w-full"
                    value={data.config?.externalShopUrl ?? ''}
                    placeholder="https://your-shop.com"
                    required />
            </fieldset>

            <fieldset class="fieldset w-full">
                <label class="flex cursor-pointer justify-between py-2">
                    <span class="label">Shop page visible</span>
                    <input
                        name="isActive"
                        type="checkbox"
                        class="toggle toggle-primary"
                        checked={data.config?.isActive ?? true} />
                </label>
            </fieldset>

            <fieldset class="fieldset w-full">
                <label class="label">Product Previews (JSON array)</label>
                <p class="text-xs text-base-content/50 mb-1">
                    [{`{"name":"Reunion Tee","imageUrl":"...","description":"..."}`}]
                </p>
                <textarea name="products" class="textarea h-32 w-full"
                    >{data.config?.products
                        ? JSON.stringify(data.config.products, null, 2)
                        : ''}</textarea>
            </fieldset>

            <div class="flex gap-4">
                <button type="submit" class="btn btn-primary">Save Settings</button>
            </div>
        </form>
    </div>
</section>
