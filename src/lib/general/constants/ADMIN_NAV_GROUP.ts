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
        { href: '/admin/events', label: 'Events' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/photos', label: 'Photos' },
        { href: '/admin/storefront', label: 'Storefront' },
    ],
}
