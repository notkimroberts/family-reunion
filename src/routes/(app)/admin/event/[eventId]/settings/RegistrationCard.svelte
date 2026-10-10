<script lang="ts">
import { CalendarClock, Lock, ToggleRight } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import { WARNING_SURFACE_CLASS } from '$lib/general/constants'
import { EVENT_STATUS_ORDER, EVENT_STATUS_STYLES } from '$lib/general/constants/EVENT_STATUS_STYLES'
import { getRegistrationState, type RegistrationState } from '$lib/general/registration'
import { cn, formatReunionDateTime, parseReunionWallClock } from '$lib/utils'
import type { PageData } from './$types'
import DateRangeForm from './DateRangeForm.svelte'
import { registrationBanner } from './registrationBanner'

/* Status, opening date and closing date in one card, because together they answer one question: can
   the public register right now? Apart, the status card said "accepting parties and payments" for an
   open year whose opening date had not come.

   The banner reads the STORED values and the clock. The dates only matter while the status is open;
   every other status refuses everyone, which the banner says rather than disabling the dates — draft is
   when they get set. Archived is the exception: its dates are history, and read-only. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold uppercase tracking-wide'

/* The two states the status alone cannot name borrow the nearest status's look. */
const BANNER_STYLES = {
    draft: EVENT_STATUS_STYLES.draft,
    scheduled: { icon: CalendarClock, class: EVENT_STATUS_STYLES.draft.class },
    open: EVENT_STATUS_STYLES.open,
    closedByDate: { icon: Lock, class: WARNING_SURFACE_CLASS },
    closed: EVENT_STATUS_STYLES.closed,
    archived: EVENT_STATUS_STYLES.archived,
} as const satisfies Record<RegistrationState, { icon: unknown; class: string }>

let { event, otherOpenYear }: { event: PageData['event']; otherOpenYear: number | undefined } =
    $props()

const registrationState = $derived(getRegistrationState(event))
const banner = $derived(
    registrationBanner(registrationState, event.registrationOpensAt, event.registrationLockDate),
)
const BannerIcon = $derived(BANNER_STYLES[registrationState].icon)
const isArchived = $derived(event.status === 'archived')

/* Late registration may be deliberate, so this warns rather than blocks. */
function warnClosesAfterStart(_opens: string, closes: string): string | undefined {
    const closesAt = parseReunionWallClock(closes)
    if (!closesAt || !event.startDate || closesAt <= new Date(event.startDate)) {
        return undefined
    }
    return `Closes after the reunion starts (${formatReunionDateTime(event.startDate, 'short')}).`
}
</script>

<Card>
    <CardHeader>
        <CardTitle class="flex items-center gap-2">
            <ToggleRight class="text-muted-foreground size-4" />
            Registration
        </CardTitle>
        <CardDescription>
            Who can register, and when. Organizers can add and change registrations here at any
            time.
        </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-5">
        <div
            class={cn(
                'flex items-start gap-3 rounded-lg border px-4 py-3',
                BANNER_STYLES[registrationState].class,
            )}>
            <BannerIcon class="mt-0.5 size-5 shrink-0" />
            <div class="flex flex-col gap-0.5">
                <p class="text-sm font-semibold">{banner.headline}</p>
                <p class="text-sm">{banner.note}</p>
            </div>
        </div>

        <DateRangeForm
            action="?/update_window"
            first={{
                name: 'registrationOpensAt',
                label: 'Opens',
                stored: event.registrationOpensAt,
                emptyNote: 'No opening date — open as soon as the status is Open.',
            }}
            second={{
                name: 'registrationLockDate',
                label: 'Closes',
                stored: event.registrationLockDate,
                emptyNote: 'No closing date — open until the status changes.',
            }}
            allowEqual={false}
            orderError="Closes must be after Opens, or registration never opens."
            disabled={isArchived}
            warn={warnClosesAfterStart} />

        <Separator />

        <div class="flex flex-col gap-2">
            <p class={SUBHEAD_CLASS}>Status</p>
            <!-- One button per status rather than a select and a Save: nothing is half-changed. The
                 current one is a label, not a button, so there is nothing to click that does nothing. -->
            <div class="flex flex-wrap gap-2">
                {#each EVENT_STATUS_ORDER as status (status)}
                    {@const style = EVENT_STATUS_STYLES[status]}
                    {@const Icon = style.icon}
                    {#if status === event.status}
                        <span
                            aria-current="true"
                            class={cn(
                                'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium',
                                style.class,
                            )}>
                            <Icon class="size-4" />
                            {style.label}
                        </span>
                    {:else}
                        <form method="POST" action="?/update_status" use:enhance>
                            <input type="hidden" name="status" value={status} />
                            <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                class={style.tone}
                                disabled={status === 'open' && otherOpenYear !== undefined}>
                                <Icon class="size-4" />
                                {style.label}
                            </Button>
                        </form>
                    {/if}
                {/each}
            </div>
            <!-- Said before the click, not after: the one_open_event index would refuse it with 409. -->
            {#if otherOpenYear !== undefined && event.status !== 'open'}
                <p class="text-muted-foreground text-sm">
                    {otherOpenYear} is open. Close it before you open this year.
                </p>
            {/if}
        </div>
    </CardContent>
</Card>
