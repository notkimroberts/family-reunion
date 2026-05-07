<script lang="ts">
import { enhance } from '$app/forms'
import PageTitle from '$lib/components/PageTitle.svelte'

let { form } = $props()
</script>

<PageTitle title="Contact" />

<div class="max-w-lg mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Contact Us</h1>

    {#if form?.success}
        <div class="alert alert-success mb-4">
            <span>Message sent! We'll get back to you soon.</span>
        </div>
    {/if}

    {#if form?.error}
        <div class="alert alert-error mb-4">
            <span>{form.error}</span>
        </div>
    {/if}

    <div class="card bg-base-100 shadow-md">
        <div class="card-body">
            <form method="POST" use:enhance class="space-y-4">
                <div class="form-control w-full">
                    <label class="label" for="name"><span class="label-text">Name</span></label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        class="input input-bordered"
                        required />
                </div>

                <div class="form-control w-full">
                    <label class="label" for="email"><span class="label-text">Email</span></label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        class="input input-bordered"
                        required />
                </div>

                <div class="form-control w-full">
                    <label class="label" for="message"
                        ><span class="label-text">Message</span></label>
                    <textarea
                        id="message"
                        name="message"
                        class="textarea textarea-bordered h-32"
                        required></textarea>
                </div>

                <!-- Honeypot -->
                <div class="hidden" aria-hidden="true">
                    <input name="website" type="text" tabindex="-1" autocomplete="off" />
                </div>

                <button type="submit" class="btn btn-primary w-full">Send Message</button>
            </form>
        </div>
    </div>
</div>
