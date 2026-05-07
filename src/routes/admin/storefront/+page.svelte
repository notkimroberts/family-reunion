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
                <div class="form-control w-full">
                    <label class="label"><span class="label-text">External Shop URL</span></label>
                    <input
                        name="externalShopUrl"
                        type="url"
                        class="input input-bordered"
                        value={data.config?.externalShopUrl ?? ''}
                        placeholder="https://your-shop.com"
                        required />
                </div>

                <div class="form-control">
                    <label class="label cursor-pointer justify-start gap-2">
                        <input
                            name="isActive"
                            type="checkbox"
                            class="toggle toggle-primary"
                            checked={data.config?.isActive ?? true} />
                        <span class="label-text">Shop page visible</span>
                    </label>
                </div>

                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text">Product Previews (JSON array)</span>
                    </label>
                    <label class="label">
                        <span class="label-text-alt"
                            >[{`{"name":"Reunion Tee","imageUrl":"...","description":"..."}`}]</span>
                    </label>
                    <textarea name="products" class="textarea textarea-bordered h-32"
                        >{data.config?.products
                            ? JSON.stringify(data.config.products, null, 2)
                            : ''}</textarea>
                </div>

                <button type="submit" class="btn btn-primary">Save Settings</button>
            </form>
        </div>
    </div>

    <div class="mt-4">
        <a href="/admin" class="btn btn-ghost">&larr; Back to Dashboard</a>
    </div>
</div>
