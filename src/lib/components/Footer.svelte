<script lang="ts">
import Facebook from '@lucide/svelte/icons/facebook'
import { APP_NAME } from '$lib/general/constants'

const year = new Date().getFullYear()
const facebookUrl = 'https://www.facebook.com/groups/184942831561183/'
</script>

<footer class="text-muted-foreground/50 px-4 py-6 text-center text-xs">
    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <a href="/" class="hover:text-muted-foreground transition-colors">Home</a>
        <a href="/contact" class="hover:text-muted-foreground transition-colors">Contact</a>
        <a href="/program" class="hover:text-muted-foreground transition-colors">Program</a>
        <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            class="hover:text-muted-foreground transition-colors">
            <Facebook class="h-3.5 w-3.5" />
        </a>
        <span>© {year} {APP_NAME}</span>
        <a href="/changelog" class="hover:text-muted-foreground transition-colors opacity-50">
            v{__APP_VERSION__}
        </a>
    </div>
</footer>
