<script lang="ts">
import { APP_NAME } from '$lib/general/constants'

let { children } = $props()
</script>

<div class="min-h-screen bg-base-200">
    <nav class="navbar bg-base-100 shadow-xs">
        <div class="navbar-start">
            <a href="/" class="btn btn-ghost text-xl font-heading font-bold text-primary"
                >{APP_NAME}</a>
        </div>
        <div class="navbar-end">
            <a href="/login" class="btn btn-primary btn-sm">Sign In</a>
        </div>
    </nav>

    <main>
        {@render children()}
    </main>
</div>
