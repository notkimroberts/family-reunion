<script lang="ts">
import { ClipboardPen, HeartHandshake, Home, Images, LayoutDashboard, LogOut } from '@lucide/svelte'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Sheet, SheetContent } from '$lib/components/ui/sheet'
import {
    APP_NAME,
    DONATE_NAV_LINK,
    PHOTOS_NAV_LINK,
    REGISTER_NAV_LINK,
} from '$lib/general/constants'
import { getInitials } from '$lib/utils'

type Props = {
    open: boolean
    onClose: () => void
}

let { open, onClose }: Props = $props()

/* From page.data, like AppHeader — the root layout returns `user` on every route. */
let user = $derived(page.data.user)

function handleSignOut() {
    authClient.signOut().then(() => {
        window.location.href = '/'
    })
}

function isActive(href: string): boolean {
    if (href === '/') {
        return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(href)
}

const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`
</script>

<Sheet {open} onOpenChange={(o) => !o && onClose()}>
    <SheetContent side="left" class="flex w-72 flex-col gap-0 p-0">
        <div class="flex items-center gap-3 border-b px-4 py-4">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="h-8 w-8 rounded-full object-cover" />
            <span class="text-sm font-semibold">{APP_NAME}</span>
        </div>

        <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
            <a href="/" onclick={onClose} class={linkClass(isActive('/'))}>
                <Home class="h-4 w-4" />
                Home
            </a>
            <a
                href={PHOTOS_NAV_LINK.href}
                onclick={onClose}
                class={linkClass(isActive(PHOTOS_NAV_LINK.href))}>
                <Images class="h-4 w-4" />
                {PHOTOS_NAV_LINK.label}
            </a>
            <a
                href={DONATE_NAV_LINK.href}
                onclick={onClose}
                class={linkClass(isActive(DONATE_NAV_LINK.href))}>
                <HeartHandshake class="h-4 w-4" />
                {DONATE_NAV_LINK.label}
            </a>
            {#if user?.role === 'admin'}
                <a href="/admin" onclick={onClose} class={linkClass(isActive('/admin'))}>
                    <LayoutDashboard class="h-4 w-4" />
                    Admin
                </a>
            {/if}

            <div class="pt-3">
                <a
                    href={REGISTER_NAV_LINK.href}
                    onclick={onClose}
                    class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
                    <ClipboardPen class="h-4 w-4" />
                    {REGISTER_NAV_LINK.label}
                </a>
            </div>
        </nav>

        <!-- The theme toggle moved to the header bar, where it is visible without opening this. What is
             left here is the account block, and only when there is an account. -->
        {#if user}
            <div class="flex items-center gap-3 border-t p-3">
                <Avatar class="h-8 w-8 shrink-0">
                    <AvatarFallback class="bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                <span class="flex-1 truncate text-sm font-medium">{user.name}</span>
                <button
                    onclick={handleSignOut}
                    class="text-muted-foreground hover:text-destructive flex items-center gap-1.5 text-sm transition-colors">
                    <LogOut class="h-4 w-4" />
                    Sign out
                </button>
            </div>
        {/if}
    </SheetContent>
</Sheet>
