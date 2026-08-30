<script lang="ts">
import { ClipboardPen, Home, LayoutDashboard, LogOut } from '@lucide/svelte'
import { page } from '$app/state'
import { authClient } from '$lib/auth-client'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Sheet, SheetContent } from '$lib/components/ui/sheet'
import { APP_NAME, REGISTER_NAV_LINK } from '$lib/general/constants'
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
    <SheetContent side="left" class="w-72 p-0 flex flex-col gap-0">
        <div class="flex items-center gap-3 px-4 py-4 border-b">
            <img
                src="/will_and_roxie_favicon_64.png"
                alt={APP_NAME}
                class="w-8 h-8 rounded-full object-cover" />
            <span class="font-semibold text-sm">{APP_NAME}</span>
        </div>

        <nav class="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
            <a href="/" onclick={onClose} class={linkClass(isActive('/'))}>
                <Home class="h-4 w-4" />
                Home
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
                    class="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <ClipboardPen class="h-4 w-4" />
                    {REGISTER_NAV_LINK.label}
                </a>
            </div>
        </nav>

        <!-- The theme toggle moved to the header bar, where it is visible without opening this. What is
             left here is the account block, and only when there is an account. -->
        {#if user}
            <div class="border-t p-3 flex items-center gap-3">
                <Avatar class="w-8 h-8 shrink-0">
                    <AvatarFallback class="bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                <span class="text-sm font-medium truncate flex-1">{user.name}</span>
                <button
                    onclick={handleSignOut}
                    class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors">
                    <LogOut class="h-4 w-4" />
                    Sign out
                </button>
            </div>
        {/if}
    </SheetContent>
</Sheet>
