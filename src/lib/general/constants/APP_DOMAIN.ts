/* The live domain, matching Railway's RAILWAY_PUBLIC_DOMAIN and BETTER_AUTH_URL.

   It carried a "TODO: update before launch" for long enough to become misleading — this is the actual
   domain, and the note sent people looking for a change that had already happened.

   What it is load-bearing for: the transactional email FROM address, EMAIL_FROM_ADDRESS, which is
   `reunion@<APP_DOMAIN>`. That domain has to be verified in Resend or every send is rejected — and
   since send() throws on Resend's error rather than resolving quietly, a registrant would reach
   Stripe, pay, and never receive their management link. Changing this means re-verifying the new
   domain in Resend first.

   The domain also RECEIVES mail now: root MX records point at ImprovMX, whose catch-all forwards
   every address to the committee Gmail, which replies through Resend's SMTP relay. CONTACT_EMAIL is
   on this domain because of that. Two independent MX systems share the zone — root is ImprovMX for
   inbound, `send.` is Resend's bounce feedback — so never consolidate or prune the MX records
   without checking which one you are holding.

   Nothing builds a URL from this constant: manage and register links come from the request
   origin. */
export const APP_DOMAIN = 'pattersonfamilyreunion27.com'
