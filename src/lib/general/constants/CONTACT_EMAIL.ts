import { APP_DOMAIN } from './APP_DOMAIN'

/* The public address for the reunion organizers, printed on the site and in every email template,
   set as the Reply-To header by send(), and the only Zelle recipient (ZELLE_RECIPIENT).

   It is on APP_DOMAIN rather than the committee's gmail.com so registrants see one identity. Mail for
   the domain is Google Workspace, and `organizers@` must EXIST there — as an alias of an organizer's
   account or as a Google Group open to posts from anyone on the web. There is deliberately no
   catch-all, so a misspelled address bounces instead of looking official. If this address is not set
   up in Workspace, every reply and every "email the organizers" link on the site bounces, while the
   site still advertises it.

   Changing it also means re-enrolling the new address with Zelle at the bank, since the site and the
   emails name it as the one Zelle recipient.

   This equals EMAIL_FROM_ADDRESS today. Keep them separable anyway: From is constrained by what
   Resend will authenticate, Reply-To is a human inbox, and those two constraints can diverge. */
export const CONTACT_EMAIL = `organizers@${APP_DOMAIN}`
