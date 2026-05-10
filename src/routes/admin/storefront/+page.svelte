<script lang="ts">
import { enhance } from '$app/forms'

let { data, form } = $props()
</script>

<svelte:head>
    <title>Storefront Settings — Admin</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Storefront Settings</h1>

    {#if form?.success}
        <div class="alert alert-success mb-4"><span>Saved!</span></div>
    {/if}
    {#if form?.error}
        <div class="alert alert-error mb-4"><span>{form.error}</span></div>
    {/if}

    <div class="card bg-base-100 shadow-md">
        <div class="card-body">
            <form method="POST" use:enhance class="space-y-4">
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">External Shop URL</legend>
                    <input
                        name="externalShopUrl"
                        type="url"
                        class="input w-full"
                        value={data.config?.externalShopUrl ?? ''}
                        placeholder="https://your-shop.com"
                        required />
                </fieldset>

                <div>
                    <label class="label cursor-pointer justify-start gap-2">
                        <input
                            name="isActive"
                            type="checkbox"
                            class="toggle toggle-primary"
                            checked={data.config?.isActive ?? true} />
                        <span>Shop page visible</span>
                    </label>
                </div>

                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Product Previews (JSON array)</legend>
                    <p class="fieldset-label">
                        [{`{"name":"Reunion Tee","imageUrl":"...","description":"..."}`}]
                    </p>
                    <textarea name="products" class="textarea h-32 w-full"
                        >{data.config?.products
                            ? JSON.stringify(data.config.products, null, 2)
                            : ''}</textarea>
                </fieldset>

                <button type="submit" class="btn btn-primary">Save Settings</button>
            </form>
        </div>
    </div>

    <div class="mt-4">
        <a href="/admin" class="btn btn-ghost">&larr; Back to Dashboard</a>
    </div>
</div>
