/* The live domain, matching Railway's RAILWAY_PUBLIC_DOMAIN and BETTER_AUTH_URL.

   It carried a "TODO: update before launch" for long enough to become misleading — this is the actual
   domain, and the note sent people looking for a change that had already happened.

   What it is load-bearing for: the transactional email FROM address, EMAIL_FROM_ADDRESS, which is
   `reunion@<APP_DOMAIN>`. That domain has to be verified in Resend or every send is rejected — and
   since send() throws on Resend's error rather than resolving quietly, a registrant would reach
   Stripe, pay, and never receive their management link. Changing this means re-verifying the new
   domain in Resend first.

   Nothing RECEIVES mail here — there is no MX record — so replies are routed by the Reply-To header
   send() sets, not by this domain. Nothing else builds a URL from it either: manage and register
   links come from the request origin. */
export const APP_DOMAIN = 'pattersonfamilyreunion27.com'
