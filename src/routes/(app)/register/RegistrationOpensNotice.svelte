<script lang="ts">
import { CalendarClock, HeartHandshake } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { CONTACT_EMAIL, CONTACT_PHONE } from '$lib/general/constants'
import { formatReunionDateTime, toE164 } from '$lib/utils'

/* Shown in place of the form until registration opens. Says the day only, like the home page, read
   in the reunion's zone so it is the same date for a relative in any state. The server refuses a
   submission until then as well (assertRegistrationOpen); hiding the form is only the courtesy. */
let { opensAt }: { opensAt: Date | string } = $props()
</script>

<section class="col-span-12">
    <div class="bg-card flex flex-col items-center gap-4 rounded-xl border px-6 py-12 text-center">
        <CalendarClock class="text-primary size-8" />
        <div class="flex flex-col gap-1">
            <p class="text-lg font-semibold">Registration opens soon</p>
            <p class="text-base">
                Come back on
                <span class="font-semibold">{formatReunionDateTime(opensAt, 'day')}</span>
                to register your party.
            </p>
        </div>
        <p class="text-muted-foreground max-w-md text-sm">
            Questions before then? Email
            <a class="underline" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
            or text
            <a class="underline" href="sms:{toE164(CONTACT_PHONE)}">{CONTACT_PHONE}</a>.
        </p>
        <!-- Gifts do not wait for registration — /donate has never followed these dates. -->
        <Button href="/donate" variant="outline">
            <HeartHandshake class="size-4" />
            Give a gift now
        </Button>
    </div>
</section>
