/* Paths in the (app) route group that anyone may view without signing in.

   For launch this is the registration funnel and the donation page: '/' for the landing page,
   '/register' which covers the form, '/register/manage' and '/register/recover', and '/donate'
   which covers '/donate/thanks'. Everything else in the group — program, changelog, admin — is
   admin-only.

   '/donate' is public for the same reason '/register' is, and stays reachable after the
   registration lock date: a gift needs no chair, so nothing about it is bounded by the deadline.

   '/photos' covers the gallery grid and '/photos/contribute', the upload form — one prefix for
   both, as '/register' covers manage and recover. Contributing carries no credential at all, so
   nothing uploaded is publicly reachable until an organiser approves it; see ADR 0009. The byte
   proxy at /api/photos/* sits outside the (app) group and enforces that itself.

   SCOPE, so this is not mistaken for a complete lock:
   - The (app) layout load calls this, so it gates page VIEWS. A SvelteKit layout load runs
     AFTER a form action, so it cannot protect actions. Those carry their own guards:
     requireAdmin across /admin.
   - Routes outside the (app) group are not covered here at all, and must stay reachable:
     /api/webhooks/stripe (Stripe sends no session — blocking it breaks every payment),
     /api/webhooks/resend (Resend sends no session; blocking it hides every bounce),
     /api/registration/status (polled while payment settles), /api/auth/* (Better Auth),
     and /api/health (Railway's health check).

   To reopen a page after the reunion, add its prefix back here. */
const PUBLIC_PATH_PREFIXES = ['/', '/register', '/donate', '/photos']

export function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
}
