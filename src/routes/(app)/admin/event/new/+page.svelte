<script lang="ts">
import { CalendarPlus } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { APP_NAME } from '$lib/general/constants'

/* A page, not a panel. See the note in +page.server.ts for why this moved off /admin.

   Two fields and both are pre-filled, so the common case — "same reunion, next year" — is read, not
   typed. form?.title and form?.year come back on a rejected save so a typo'd year does not also lose
   the title. */

let { data, form } = $props()
</script>

<svelte:head>
    <title>Add a reunion year — {APP_NAME}</title>
</svelte:head>

<!-- col-span-12, NOT xl:col-span-6. The card below is 6 wide, so a 6-wide heading sat BESIDE it at
     xl — heading left, form right — and the empty left column stretched the grid row, stranding
     everything after it. Sections on this grid stack only when their spans cannot share a row. -->
<section class="col-span-12 flex flex-col gap-3">
    <nav aria-label="Breadcrumb" class="text-muted-foreground flex items-center gap-2 text-sm">
        <a href="/admin" class="transition-colors hover:text-foreground">Reunions</a>
        <span aria-hidden="true">/</span>
        <span class="text-foreground">New</span>
    </nav>

    <h1>Add a reunion year</h1>
</section>

<section class="col-span-12 xl:col-span-6">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <CalendarPlus class="text-muted-foreground size-4" />
                The year itself
            </CardTitle>
            <CardDescription>
                It starts as a draft with Adult and Child tiers at $0, so nobody can register until
                you price them and open it. You go straight to its settings to do that.
            </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            {#if form?.createError}
                <Alert variant="destructive">
                    <AlertDescription>{form.createError}</AlertDescription>
                </Alert>
            {/if}

            <form method="POST" use:enhance class="flex flex-col gap-4">
                <Field.Field class="gap-2">
                    <Field.Label for="new-event-title">Title</Field.Label>
                    <Input
                        id="new-event-title"
                        name="title"
                        type="text"
                        placeholder="Patterson Family Reunion"
                        value={form?.title ?? data.suggestedTitle}
                        required />
                    <Field.Description>Shown as the heading on every page.</Field.Description>
                </Field.Field>

                <Field.Field class="gap-2">
                    <Field.Label for="new-event-year">Year</Field.Label>
                    <Input
                        id="new-event-year"
                        name="year"
                        type="number"
                        inputmode="numeric"
                        value={form?.year ?? data.suggestedYear}
                        required />
                    <Field.Description>
                        Used to order the list and to name the reunion. A past year is fine.
                    </Field.Description>
                </Field.Field>

                <div class="flex flex-wrap items-center gap-2">
                    <Button type="submit">Create</Button>
                    <Button href="/admin" variant="ghost">Cancel</Button>
                </div>
            </form>
        </CardContent>
    </Card>
</section>
