type NavLink = {
    href: string
    label: string
}

type SidebarLink = {
    href: string
    label: string
    icon: string
}

type SidebarGroup = {
    label: string
    icon: string
    children: NavLink[]
}

export type SidebarItem = SidebarLink | SidebarGroup

export function isSidebarGroup(item: SidebarItem): item is SidebarGroup {
    return 'children' in item
}

export const sidebarLinks: SidebarItem[] = [
    { href: '/', label: 'Home', icon: 'mdi/home' },
    { href: '/gallery', label: 'Gallery', icon: 'mdi/image-multiple' },
    { href: '/family-tree', label: 'Family Tree', icon: 'mdi/family-tree' },
    { href: '/members', label: 'Members', icon: 'mdi/account-group' },
    { href: '/program', label: 'Program', icon: 'mdi/calendar-clock' },
    { href: '/shop', label: 'Shop', icon: 'mdi/shopping' },
    { href: '/register', label: 'Register', icon: 'mdi/clipboard-edit' },
    { href: '/contact', label: 'Contact', icon: 'mdi/email' },
]

export const adminSidebarGroup: SidebarGroup = {
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
