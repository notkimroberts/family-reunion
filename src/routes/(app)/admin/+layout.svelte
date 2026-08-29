<script lang="ts">
let { children } = $props()
</script>

<!-- No admin header. The app's own nav already carries the theme toggle, sign out and the avatar, and a
     second copy of those on every admin page was the duplication this replaced. What is genuinely
     admin-specific — which reunion you are looking at, and the way into Setup — belongs beside the
     numbers it applies to, so it lives in the status card on the registrations page.

     This layout exists only to hold the 12-column grid the admin sections resolve against; the sidebar,
     the year-pill row and the 'admin' Svelte context that used to live here are all gone. -->
{@render children()}
