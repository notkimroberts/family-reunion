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
    { href: '/gallery', label: 'Gallery', icon: 'mdi/image-multiple' },
    { href: '/family-tree', label: 'Family Tree', icon: 'mdi/family-tree' },
    { href: '/members', label: 'Members', icon: 'mdi/account-group' },
]

export const secondaryNavLinks: NavLink[] = [
    { href: '/program', label: 'Program', icon: 'mdi/calendar-clock' },
    { href: '/shop', label: 'Shop', icon: 'mdi/shopping' },
    { href: '/register', label: 'Register', icon: 'mdi/clipboard-edit' },
]

export const adminNavGroup: NavGroup = {
    label: 'Admin',
    icon: 'mdi/shield-crown',
    children: [
        { href: '/admin', label: 'Overview' },
        { href: '/admin/events', label: 'Events' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/photos', label: 'Photos' },
        { href: '/admin/storefront', label: 'Storefront' },
    ],
}
