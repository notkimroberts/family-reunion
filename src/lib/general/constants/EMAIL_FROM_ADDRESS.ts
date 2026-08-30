import { APP_DOMAIN } from './APP_DOMAIN'

/* The envelope address every transactional email is sent from.

   NOT `noreply@`. Resend's deliverability insights flag the string outright — telling a recipient the
   channel is one-way discourages the inbox feedback that reputation is partly built on — and here it
   was also false advertising in reverse: all three templates print "Questions? Reply to this email",
   against an address nobody read.

   It has to stay on APP_DOMAIN, which is the domain verified in Resend; DKIM and SPF align on that,
   and sending as the committee's gmail.com would fail both. Replies do NOT come back to this address
   — nothing receives mail on this domain, there is no MX record — they are routed by the Reply-To
   header that send() sets to CONTACT_EMAIL. */
export const EMAIL_FROM_ADDRESS = `reunion@${APP_DOMAIN}`
