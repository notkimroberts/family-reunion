<script lang="ts">
import { CalendarDays, Clock } from '@lucide/svelte'
import { SvelteMap } from 'svelte/reactivity'
import { slide } from 'svelte/transition'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { pickDefaultItem } from './scheduleTime'
import type { ScheduleItem } from './types'

interface Props {
    schedule: ScheduleItem[]
    venueName?: string
    startDate?: string
}

let { schedule, venueName, startDate }: Props = $props()

function scrollIntoView(node: HTMLElement) {
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    return {}
}

let selectedItem = $state<ScheduleItem>(pickDefaultItem(schedule, startDate))

let scheduleByDay = $derived.by(() => {
    const days = new SvelteMap<string, ScheduleItem[]>()
    for (const item of schedule) {
        if (!days.has(item.day)) {
            days.set(item.day, [])
        }
        days.get(item.day)!.push(item)
    }
    return [...days.entries()].map(([day, items]) => ({ day, items }))
})

let selectedDayItems = $derived(
    selectedItem ? schedule.filter((i) => i.day === selectedItem!.day) : [],
)

function handleSelectItem(item: ScheduleItem) {
    selectedItem = item
}

function isSelected(item: ScheduleItem) {
    return (
        selectedItem?.day === item.day &&
        selectedItem?.time === item.time &&
        selectedItem?.activity === item.activity
    )
}
</script>

<Card>
    <CardHeader>
        <CardTitle class="flex items-center gap-2">
            <CalendarDays class="size-5" />
            Schedule
        </CardTitle>
    </CardHeader>
    <CardContent class="p-0">
        <div class="grid grid-cols-1 md:grid-cols-2">
            <!-- List -->
            <div class="space-y-6 p-6 md:border-r">
                {#each scheduleByDay as { day, items }}
                    <div>
                        <p
                            class="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-widest">
                            {day}
                        </p>
                        <div class="space-y-1">
                            {#each items as item}
                                <button
                                    onclick={() => handleSelectItem(item)}
                                    class="flex w-full cursor-pointer items-start gap-4 rounded-lg px-3 py-2.5 text-left transition-colors {isSelected(
                                        item,
                                    )
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted/50'}">
                                    <div
                                        class="flex w-24 shrink-0 items-center gap-1.5 pt-0.5 text-sm {isSelected(
                                            item,
                                        )
                                            ? ''
                                            : 'text-muted-foreground'}">
                                        <Clock class="size-3.5 shrink-0" />
                                        <span class="tabular-nums">{item.time}</span>
                                    </div>
                                    <span class="font-medium">{item.activity}</span>
                                </button>

                                {#if isSelected(item)}
                                    <div
                                        class="md:hidden px-3 pb-3 pt-1"
                                        transition:slide={{ duration: 200 }}
                                        use:scrollIntoView>
                                        <div class="bg-primary/5 rounded-lg p-4 space-y-1.5">
                                            <p class="font-semibold">{item.activity}</p>
                                            <div
                                                class="text-muted-foreground flex items-center gap-1.5 text-sm">
                                                <Clock class="size-3.5 shrink-0" />
                                                <span>{item.time}</span>
                                            </div>
                                            {#if venueName}
                                                <p class="text-muted-foreground text-sm">
                                                    {venueName}
                                                </p>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Detail panel (desktop only) -->
            <div class="hidden md:block p-6">
                {#if selectedItem}
                    <div class="space-y-5">
                        <div>
                            <p
                                class="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-widest">
                                {selectedItem.day}
                            </p>
                            <p class="text-2xl font-bold">{selectedItem.activity}</p>
                            <div
                                class="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                                <Clock class="size-3.5" />
                                <span>{selectedItem.time}</span>
                            </div>
                            {#if venueName}
                                <p class="text-muted-foreground mt-0.5 text-sm">{venueName}</p>
                            {/if}
                        </div>

                        {#if selectedDayItems.length > 1}
                            <div>
                                <p
                                    class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-widest">
                                    {selectedItem.day} at a glance
                                </p>
                                <ol class="space-y-2">
                                    {#each selectedDayItems as dayItem}
                                        <li
                                            class="flex items-center gap-3 text-sm"
                                            class:font-semibold={isSelected(dayItem)}
                                            class:text-primary={isSelected(dayItem)}
                                            class:text-muted-foreground={!isSelected(dayItem)}>
                                            <span class="tabular-nums">{dayItem.time}</span>
                                            <span class="bg-border h-px flex-1"></span>
                                            <span>{dayItem.activity}</span>
                                        </li>
                                    {/each}
                                </ol>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div
                        class="flex h-full min-h-40 flex-col items-center justify-center text-center">
                        <CalendarDays class="text-muted-foreground/40 mb-3 size-10" />
                        <p class="text-muted-foreground text-sm">
                            Select an activity to see details.
                        </p>
                    </div>
                {/if}
            </div>
        </div>
    </CardContent>
</Card>
