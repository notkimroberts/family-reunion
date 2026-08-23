/* Paths in the (app) route group that anyone may view without signing in.

   For launch this is only the registration funnel: '/' for the landing page, and '/register'
   which covers the form, '/register/manage' and '/register/recover'. Everything else in the
   group — family tree, gallery, shop, program, changelog, admin — is admin-only.

   SCOPE, so this is not mistaken for a complete lock:
   - The (app) layout load calls this, so it gates page VIEWS. A SvelteKit layout load runs
     AFTER a form action, so it cannot protect actions. Those carry their own guards:
     requireAdmin in family-tree, requireAuth in gallery, requireAdmin across /admin.
   - Routes outside the (app) group are not covered here at all, and must stay reachable:
     /api/webhooks/stripe (Stripe sends no session — blocking it breaks every payment),
     /api/registration/status (polled while payment settles), /api/auth/* (Better Auth),
     and /api/health (Railway's health check).

   To reopen a page after the reunion — the gallery, most likely — add its prefix back here. */
const PUBLIC_PATH_PREFIXES = ['/', '/register']

export function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
}
