<script lang="ts">
import { CalendarClock, ClipboardPen, Mail, ShieldCheck, ShoppingBag, X } from '@lucide/svelte'
import type { Component } from 'svelte'
import { authClient } from '$lib/auth-client'
import { Button } from '$lib/components/ui/button'
import { Separator } from '$lib/components/ui/separator'
import { Sheet, SheetContent } from '$lib/components/ui/sheet'
import { secondaryNavLinks } from '$lib/general/constants'
import { getInitials } from '$lib/utils'
import ThemeToggle from './ThemeToggle.svelte'

type Props = {
    open: boolean
    user: { name: string | null; role?: string | null } | null
    isAdmin: boolean
    onClose: () => void
}

let { open, user, isAdmin, onClose }: Props = $props()

const iconMap: Record<string, Component> = {
    'calendar-clock': CalendarClock,
    'shopping-bag': ShoppingBag,
    'clipboard-pen': ClipboardPen,
    mail: Mail,
}

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}
</script>

<Sheet {open} onOpenChange={(o) => !o && onClose()}>
    <SheetContent
        side="bottom"
        class="md:hidden rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between px-1 pb-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                More
            </span>
            <Button variant="ghost" size="icon" onclick={onClose} aria-label="Close menu">
                <X size={20} />
            </Button>
        </div>

        <nav class="flex flex-col gap-1">
            {#each secondaryNavLinks as link}
                {@const Icon = iconMap[link.icon]}
                <a
                    href={link.href}
                    onclick={onClose}
                    class="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted transition-colors text-foreground">
                    <Icon size={20} class="text-muted-foreground" />
                    <span class="font-medium">{link.label}</span>
                </a>
            {/each}
            {#if isAdmin}
                <a
                    href="/admin"
                    onclick={onClose}
                    class="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted transition-colors text-foreground">
                    <ShieldCheck size={20} class="text-muted-foreground" />
                    <span class="font-medium">Admin</span>
                </a>
            {/if}
        </nav>

        <Separator class="my-3" />

        <div class="flex items-center justify-between px-2 py-2">
            <span class="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle size="sm" />
        </div>

        {#if user}
            <Separator class="my-3" />
            <div class="flex items-center justify-between px-2 py-2">
                <div class="flex items-center gap-2">
                    <div
                        class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(user.name ?? '?')}
                    </div>
                    <div>
                        <p class="font-medium text-sm">{user.name}</p>
                        <a
                            href="/profile"
                            onclick={onClose}
                            class="text-xs text-primary hover:underline">
                            View Profile
                        </a>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={handleSignOut}
                    class="text-destructive hover:text-destructive">
                    Sign Out
                </Button>
            </div>
        {/if}
    </SheetContent>
</Sheet>
