import { APP_DOMAIN } from './APP_DOMAIN'

/* The envelope address every transactional email is sent from.

   NOT `noreply@`. Resend's deliverability insights flag the string outright — telling a recipient the
   channel is one-way discourages the inbox feedback that reputation is partly built on — and here it
   was also false advertising in reverse: all three templates print "Questions? Reply to this email",
   against an address nobody read.

   It has to stay on APP_DOMAIN, which is the domain verified in Resend. DKIM signs
   d=<APP_DOMAIN> (the key is at `resend._domainkey`, on the root), so this From aligns strictly;
   SPF authenticates the envelope on the `send.` subdomain and aligns under DMARC's relaxed rule.
   Sending as the committee's gmail.com would fail both.

   Replies reach a human at this address too — it is the organizers' Google Workspace address (see
   CONTACT_EMAIL) — but send() still sets an explicit Reply-To rather than relying on that. From is
   constrained by what Resend will authenticate; where replies land is a separate decision, and the
   header keeps it one. It was `reunion@`, which never existed in Workspace: a client that ignored
   Reply-To would have bounced the reply. */
export const EMAIL_FROM_ADDRESS = `organizers@${APP_DOMAIN}`
