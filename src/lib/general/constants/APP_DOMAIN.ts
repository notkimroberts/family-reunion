/* The live domain, matching Railway's RAILWAY_PUBLIC_DOMAIN and BETTER_AUTH_URL.

   This was `pattersonfamilyreunion27.com` until the cutover — a shake-out domain that carried the
   whole production identity while the app was proven. That domain is now abandoned: no Railway
   domain, no Resend verification, no mail forwarding, and no redirect from it. Nothing real had been
   sent from it, so nothing was kept for compatibility. Do not add a redirect back for it.

   What it is load-bearing for: the transactional email FROM address, EMAIL_FROM_ADDRESS, which is
   `organizers@<APP_DOMAIN>`. That domain has to be verified in Resend or every send is rejected — and
   since send() throws on Resend's error rather than resolving quietly, a registrant would reach
   Stripe, pay, and never receive their management link. Changing this means re-verifying the new
   domain in Resend FIRST, then flipping this constant.

   The domain also RECEIVES mail, through Google Workspace: root MX records point at Google, and
   CONTACT_EMAIL (`organizers@`) is a Workspace alias or group — there is no catch-all. Two
   independent MX systems share the zone — root is Google for inbound, `send.` is Resend's bounce
   feedback — so never consolidate or prune the MX records without checking which one you are
   holding. SPF is likewise split: the SINGLE root TXT record names Google, and Resend's lives on
   `send.`. A second SPF record at the root is a permerror that breaks it.

   `www` is not a Railway domain. It is a 301 at the DNS host, pointing here.

   Manage and register links in emails come from the request origin, not from this constant. The one
   place it is printed is the paper registration form ("Register online at <APP_DOMAIN>"), so a
   change here means reprinting any forms already handed out. */
export const APP_DOMAIN = 'pattersonfamilyreunion.com'
