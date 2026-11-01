<script lang="ts">
import { LifeBuoy } from '@lucide/svelte'
import { CONTACT_PHONE } from '$lib/general/constants'
import { toE164 } from '$lib/utils'
import { FAQ_LINK_CLASS } from './FAQ_LINK_CLASS'
import FaqItem from './FaqItem.svelte'
import FaqSection from './FaqSection.svelte'
import OrganizerEmail from './OrganizerEmail.svelte'
</script>

<FaqSection id="help" title="Photos and Help" icon={LifeBuoy}>
    <FaqItem question="Are the photos from the old website still available?">
        <p>
            Yes. They are all on the <a class={FAQ_LINK_CLASS} href="/photos">photos page</a>, and
            you can download them by year.
        </p>
    </FaqItem>

    <FaqItem question="Can I add my own photos?">
        <p>
            Yes, please! <a class={FAQ_LINK_CLASS} href="/photos/contribute">Add your photos</a>. An
            organizer looks at each photo before it shows on the site.
        </p>
    </FaqItem>

    <FaqItem question="What is the help phone number?">
        <p>
            Text <a class={FAQ_LINK_CLASS} href="sms:{toE164(CONTACT_PHONE)}">{CONTACT_PHONE}</a>,
            or email us. The organizers prefer email.
        </p>
        <OrganizerEmail />
    </FaqItem>
</FaqSection>
