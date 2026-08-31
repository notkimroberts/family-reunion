/* The live domain, matching Railway's RAILWAY_PUBLIC_DOMAIN and BETTER_AUTH_URL.

   This was `pattersonfamilyreunion27.com` until the cutover — a shake-out domain that carried the
   whole production identity while the app was proven. That domain is now abandoned: no Railway
   domain, no Resend verification, no mail forwarding, and no redirect from it. Nothing real had been
   sent from it, so nothing was kept for compatibility. Do not add a redirect back for it.

   What it is load-bearing for: the transactional email FROM address, EMAIL_FROM_ADDRESS, which is
   `reunion@<APP_DOMAIN>`. That domain has to be verified in Resend or every send is rejected — and
   since send() throws on Resend's error rather than resolving quietly, a registrant would reach
   Stripe, pay, and never receive their management link. Changing this means re-verifying the new
   domain in Resend FIRST, then flipping this constant.

   The domain also RECEIVES mail: root MX records point at ImprovMX, whose catch-all forwards every
   address to the committee Gmail, which replies through Resend's SMTP relay. CONTACT_EMAIL is on
   this domain because of that. Two independent MX systems share the zone — root is ImprovMX for
   inbound, `send.` is Resend's bounce feedback — so never consolidate or prune the MX records
   without checking which one you are holding. SPF is likewise a SINGLE root TXT record including
   both senders; a second SPF record is a permerror that breaks both.

   `www` is not a Railway domain. It is a 301 at the DNS host, pointing here.

   Nothing builds a URL from this constant: manage and register links come from the request
   origin. */
export const APP_DOMAIN = 'pattersonfamilyreunion.com'
