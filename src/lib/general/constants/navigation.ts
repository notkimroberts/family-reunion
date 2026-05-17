export type NavLink = {
    href: string
    label: string
    icon: string
}

type NavGroup = {
    label: string
    icon: string
    children: Omit<NavLink, 'icon'>[]
}

export const primaryNavLinks: NavLink[] = [
    // { href: '/family-tree', label: 'Family Tree', icon: 'network' },
    // { href: '/gallery', label: 'Gallery', icon: 'images' },
]

export const secondaryNavLinks: NavLink[] = [
    { href: '/program', label: 'Program', icon: 'calendar-clock' },
    // { href: '/shop', label: 'Shop', icon: 'shopping-bag' },
]

export const registerNavLink: NavLink = {
    href: '/register',
    label: 'Register',
    icon: 'clipboard-pen',
}

export const adminNavGroup: NavGroup = {
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
