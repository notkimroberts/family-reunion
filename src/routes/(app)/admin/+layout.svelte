<script lang="ts">
import {
    CalendarDays,
    ClipboardList,
    Images,
    LayoutDashboard,
    ShoppingBag,
    Users,
} from '@lucide/svelte'
import { setContext } from 'svelte'
import { page } from '$app/state'
import { Separator } from '$lib/components/ui/separator'
import type { AdminContext } from '$lib/types/adminContext'
import { cn } from '$lib/utils'

let { data, children } = $props()

let selectedEventId = $state('all')

setContext<AdminContext>('admin', {
    get selectedEventId() {
        return selectedEventId
    },
    setSelectedEventId(id: string) {
        selectedEventId = id
    },
    get events() {
        return data.events
    },
})

const navLinks = [
    { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/events', label: 'Events', Icon: CalendarDays },
    { href: '/admin/users', label: 'Users', Icon: Users },
    { href: '/admin/photos', label: 'Photos', Icon: Images },
    { href: '/admin/registrations', label: 'Registrations', Icon: ClipboardList },
    { href: '/admin/storefront', label: 'Storefront', Icon: ShoppingBag },
]

function isActive(href: string): boolean {
    if (href === '/admin') {
        return page.url.pathname === '/admin'
    }
    return page.url.pathname.startsWith(href)
}
</script>

<div class="col-span-12 flex items-start gap-0">
    <aside class="hidden md:flex w-52 shrink-0 flex-col self-start sticky top-28 border-r pr-5">
        <nav class="flex flex-col gap-0.5">
            {#each navLinks as { href, label, Icon } (href)}
                <a
                    {href}
                    class={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive(href)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}>
                    <Icon class="h-4 w-4 shrink-0" />
                    {label}
                </a>
            {/each}
        </nav>

        <Separator class="my-4" />

        <div class="flex flex-col gap-0.5">
            <p
                class="px-3 mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Year
            </p>
            <button
                class={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-left',
                    selectedEventId === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                )}
                onclick={() => (selectedEventId = 'all')}>
                All years
            </button>
            {#each data.events as event (event.id)}
                <button
                    class={cn(
                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-left',
                        selectedEventId === event.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                    )}
                    onclick={() => (selectedEventId = event.id)}>
                    {event.year}
                </button>
            {/each}
        </div>
    </aside>

    <div class="flex-1 min-w-0 md:pl-6">
        <div class="grid grid-cols-12 gap-y-8 md:gap-y-10">
            {@render children()}
        </div>
    </div>
</div>
