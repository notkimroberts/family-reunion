<script lang="ts">
import { APP_NAME } from '$lib/general/constants'

const year = new Date().getFullYear()
const facebookUrl = 'https://www.facebook.com/groups/184942831561183/'
</script>

<footer class="bg-muted text-muted-foreground rounded p-10 text-center">
    <nav class="flex flex-wrap justify-center gap-4 mb-4">
        <a href="/" class="hover:text-foreground transition-colors">Home</a>
        <a href="/contact" class="hover:text-foreground transition-colors">Contact</a>
        <a href="/program" class="hover:text-foreground transition-colors">Program</a>
        <a href="/changelog" class="hover:text-foreground transition-colors text-xs opacity-40">
            v{__APP_VERSION__}
        </a>
    </nav>
    <nav class="flex justify-center gap-4 mb-4">
        <a
            aria-label="Facebook"
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-foreground transition-colors">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                class="fill-current">
                <path
                    d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z">
                </path>
            </svg>
        </a>
    </nav>
    <aside>
        <p>Copyright © {year} — {APP_NAME}</p>
    </aside>
</footer>
