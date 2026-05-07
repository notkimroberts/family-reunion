type NavLink = {
    href: string
    label: string
}

type MobileTab = {
    href: string
    label: string
    icon: string
}

export const navLinks: NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/program', label: 'Program' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/family-tree', label: 'Family Tree' },
    { href: '/members', label: 'Members' },
    { href: '/shop', label: 'Shop' },
    { href: '/contact', label: 'Contact' },
]

export const mobileTabs: MobileTab[] = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/gallery', label: 'Gallery', icon: '🖼️' },
    { href: '/family-tree', label: 'Tree', icon: '🌳' },
    { href: '/members', label: 'Members', icon: '👥' },
]

export const mobileMenuItems: NavLink[] = [
    { href: '/program', label: 'Program' },
    { href: '/shop', label: 'Shop' },
    { href: '/contact', label: 'Contact' },
    { href: '/register', label: 'Register' },
]
