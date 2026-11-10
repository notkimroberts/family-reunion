<script lang="ts">
import { ClipboardPen } from '@lucide/svelte'
import { CHECK_PAYEE, MAILING_ADDRESS } from '$lib/general/constants'
import { formatReunionDateTime, formatUsd } from '$lib/utils'
import { FAQ_LINK_CLASS } from './FAQ_LINK_CLASS'
import FaqFacts from './FaqFacts.svelte'
import FaqItem from './FaqItem.svelte'
import FaqSection from './FaqSection.svelte'
import OrganizerEmail from './OrganizerEmail.svelte'

type Tier = { id: string; label: string; priceCents: number }

/* Prices are the open event's tiers, whose labels carry the age ranges — so this answer and the
   registration form cannot disagree. */
let { tiers, lockDate }: { tiers: Tier[]; lockDate: Date | null | undefined } = $props()

let priceRows = $derived(
    tiers.map((tier) => ({ label: tier.label, value: formatUsd(tier.priceCents) })),
)
</script>

<FaqSection id="registration" title="Registration" icon={ClipboardPen}>
    <FaqItem question="How much is registration?">
        {#if priceRows.length > 0}
            <p>The price is per person, by age:</p>
            <FaqFacts rows={priceRows} />
            <p>
                Paying by card adds a small processing fee. You see it before you pay. Zelle and
                check pay the price above.
            </p>
        {:else}
            <p>We will post the prices here when registration opens.</p>
        {/if}
    </FaqItem>

    <FaqItem question="What is the registration deadline?">
        {#if lockDate}
            <p>
                Register by <strong class="text-foreground"
                    >{formatReunionDateTime(lockDate, 'day')}</strong
                >.
            </p>
        {:else}
            <p>We will post the deadline here soon.</p>
        {/if}
    </FaqItem>

    <FaqItem question="How do I register?">
        <p>
            Online, on the <a class={FAQ_LINK_CLASS} href="/register">registration page</a>. You can
            register your whole family at once, and you do not need an account.
        </p>
    </FaqItem>

    <FaqItem question="Can I register by mail?">
        <p>
            Yes! We will mail paper registration forms to the address we have on file for your
            family. You can also <a class={FAQ_LINK_CLASS} href="/register/print">print one</a>.
            Mail the completed form, with your check if you pay by check, to:
        </p>
        <p class="text-foreground font-medium">{CHECK_PAYEE}, {MAILING_ADDRESS}</p>
        <p>
            If your form does not arrive by December, email us with your address and we will send
            you another one:
        </p>
        <OrganizerEmail />
    </FaqItem>

    <FaqItem question="I lost my confirmation email. How do I see my registration?">
        <p>
            Go to <a class={FAQ_LINK_CLASS} href="/register/recover">find my registration</a> and type
            the email you registered with. We will send you a new link.
        </p>
    </FaqItem>

    <FaqItem question="How do I add someone or change my registration?">
        <p>
            Email the organizers. Tell us the name on the registration and what to change. We make
            the change and send you an email when it is done.
        </p>
        <OrganizerEmail />
    </FaqItem>
</FaqSection>
