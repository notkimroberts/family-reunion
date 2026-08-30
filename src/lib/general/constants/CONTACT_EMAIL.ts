import { APP_DOMAIN } from './APP_DOMAIN'

/* The public address for the reunion committee, printed on the site and in every email template,
   and set as the Reply-To header by send().

   It is on APP_DOMAIN rather than the committee's gmail.com so registrants see one identity. Mail
   sent here reaches a human: the root domain has MX records pointing at ImprovMX, whose catch-all
   forwards every address on the domain to the committee Gmail, and Gmail replies as this address
   through Resend's SMTP relay. That forwarding is the whole delivery path — it is NOT a mailbox, and
   removing the root MX records makes this address silently unreachable while the site still
   advertises it.

   This equals EMAIL_FROM_ADDRESS today. Keep them separable anyway: From is constrained by what
   Resend will authenticate, Reply-To is a human inbox, and those two constraints can diverge. */
export const CONTACT_EMAIL = `reunion@${APP_DOMAIN}`
