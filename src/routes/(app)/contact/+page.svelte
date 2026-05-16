<script lang="ts">
import { enhance } from '$app/forms'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'

let { form } = $props()
</script>

{#if form?.success}
    <div class="col-span-12">
        <Alert>
            <AlertDescription>Message sent! We'll get back to you soon.</AlertDescription>
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

<section class="col-span-12 xl:col-span-7">
    <Card>
        <CardHeader>
            <CardTitle>Send a Message</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-4">
                <div class="space-y-2">
                    <label for="name" class="text-sm font-medium">Name</label>
                    <Input id="name" name="name" type="text" required />
                </div>

                <div class="space-y-2">
                    <label for="email" class="text-sm font-medium">Email</label>
                    <Input id="email" name="email" type="email" required />
                </div>

                <div class="space-y-2">
                    <label for="message" class="text-sm font-medium">Message</label>
                    <Textarea id="message" name="message" class="h-32" required />
                </div>

                <!-- Honeypot -->
                <div class="hidden" aria-hidden="true">
                    <input name="website" type="text" tabindex="-1" autocomplete="off" />
                </div>

                <Button type="submit" class="w-full">Send Message</Button>
            </form>
        </CardContent>
    </Card>
</section>

<section class="col-span-12 xl:col-span-5">
    <Card>
        <CardHeader>
            <CardTitle>Contact Info</CardTitle>
        </CardHeader>
        <CardContent>
            <p class="text-muted-foreground mb-4">Reach the reunion organizers directly:</p>
            <ul class="space-y-3">
                <li>
                    <p class="font-medium">Phone</p>
                    <a href="tel:+1234567890" class="text-primary hover:underline text-sm"
                        >+1 (234) 567-890</a>
                </li>
                <li>
                    <p class="font-medium">Email</p>
                    <a
                        href="mailto:reunion@pattersons.com"
                        class="text-primary hover:underline text-sm">reunion@pattersons.com</a>
                </li>
            </ul>
        </CardContent>
    </Card>
</section>
