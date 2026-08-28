import type { NavLink } from './NavLink'

type NavGroup = {
    label: string
    icon: string
    children: Omit<NavLink, 'icon'>[]
}

export const ADMIN_NAV_GROUP: NavGroup = {
    label: 'Admin',
    icon: 'shield-check',
    children: [
        { href: '/admin', label: 'Overview' },
        { href: '/admin/registrations', label: 'Registrations' },
        { href: '/admin/attendees', label: 'Attendees' },
        { href: '/admin/events', label: 'Events' },
        { href: '/admin/users', label: 'Users' },
        /* Photos and Storefront are deliberately absent, not forgotten. Both routes still exist and
           keep their own requireAdmin guards, so they stay reachable by URL — the gallery upload
           action lives in admin/photos, so dropping it would leave no way to add reunion photos. */
    ],
}
