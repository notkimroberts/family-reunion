<script lang="ts">
import { Mail } from '@lucide/svelte'
import { CONTACT_EMAIL } from '$lib/general/constants'
import { FAQ_LINK_CLASS } from './FAQ_LINK_CLASS'

/* The address on a line of its own after the sentence that asks for it. Inline, it fills a 375px line by
   itself and pushes the sentence's period onto the next line alone. Printed, not just linked: a mailto:
   link opens nothing on a computer with no mail app. */
</script>

<a class="{FAQ_LINK_CLASS} flex w-fit items-start gap-2" href="mailto:{CONTACT_EMAIL}">
    <Mail class="mt-1.5 size-4 shrink-0" />
    {CONTACT_EMAIL}
</a>
