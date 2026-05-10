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
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Name</legend>
                    <input id="name" name="name" type="text" class="input w-full" required />
                </fieldset>

                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Email</legend>
                    <input id="email" name="email" type="email" class="input w-full" required />
                </fieldset>

                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Message</legend>
                    <textarea id="message" name="message" class="textarea h-32 w-full" required
                    ></textarea>
                </fieldset>

                <!-- Honeypot -->
                <div class="hidden" aria-hidden="true">
                    <input name="website" type="text" tabindex="-1" autocomplete="off" />
                </div>

                <button type="submit" class="btn btn-primary w-full">Send Message</button>
            </form>
        </div>
    </div>
</div>
