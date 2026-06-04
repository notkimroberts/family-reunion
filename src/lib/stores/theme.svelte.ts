import { browser } from '$app/environment'
import { LIGHT_THEME, DARK_THEME, type Theme } from '$lib/general/constants'

/* Reads localStorage then system preference; falls back to light on the server */
function getInitialTheme(): Theme {
    if (!browser) {
        return LIGHT_THEME
    }
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) {
        return stored
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME
}

let current = $state<Theme>(LIGHT_THEME)

export const theme = {
    get current() {
        return current
    },

    /* Toggles between light and dark, persists to localStorage */
    toggle() {
        const next = current === LIGHT_THEME ? DARK_THEME : LIGHT_THEME
        current = next
        if (browser) {
            localStorage.setItem('theme', next)
            document.documentElement.classList.toggle('dark', next === DARK_THEME)
        }
    },

    /* Syncs state and DOM class to the stored/system preference; call once on mount */
    init() {
        if (browser) {
            const resolved = getInitialTheme()
            current = resolved
            document.documentElement.classList.toggle('dark', resolved === DARK_THEME)
        }
    },
}
