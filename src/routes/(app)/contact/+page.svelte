<script lang="ts">
import { enhance } from '$app/forms'

let { form } = $props()
</script>

{#if form?.success}
    <div class="alert alert-success col-span-12">
        <span>Message sent! We'll get back to you soon.</span>
    </div>
{/if}

{#if form?.error}
    <div class="alert alert-error col-span-12">
        <span>{form.error}</span>
    </div>
{/if}

<section class="card bg-base-100 col-span-12 xl:col-span-7 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Send a Message</h2>
        <form method="POST" use:enhance class="space-y-4">
            <fieldset class="fieldset w-full">
                <label class="label">Name</label>
                <input name="name" type="text" class="input w-full" required />
            </fieldset>

            <fieldset class="fieldset w-full">
                <label class="label">Email</label>
                <input name="email" type="email" class="input w-full" required />
            </fieldset>

            <fieldset class="fieldset w-full">
                <label class="label">Message</label>
                <textarea name="message" class="textarea h-32 w-full" required></textarea>
            </fieldset>

            <!-- Honeypot -->
            <div class="hidden" aria-hidden="true">
                <input name="website" type="text" tabindex="-1" autocomplete="off" />
            </div>

            <button type="submit" class="btn btn-primary w-full">Send Message</button>
        </form>
    </div>
</section>

<section class="card bg-base-100 col-span-12 xl:col-span-5 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Contact Info</h2>
        <p class="text-base-content/70 mb-4">Reach the reunion organizers directly:</p>
        <ul class="space-y-3">
            <li>
                <p class="font-medium">Phone</p>
                <a href="tel:+1234567890" class="link link-primary text-sm">+1 (234) 567-890</a>
            </li>
            <li>
                <p class="font-medium">Email</p>
                <a href="mailto:reunion@pattersons.com" class="link link-primary text-sm"
                    >reunion@pattersons.com</a>
            </li>
        </ul>
    </div>
</section>
