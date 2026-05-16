import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { LIGHT_THEME, DARK_THEME, type Theme } from '$lib/general/constants'

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

function createThemeStore() {
    const { subscribe, set, update } = writable<Theme>(getInitialTheme())

    return {
        subscribe,
        toggle: () => {
            update((current) => {
                const next = current === LIGHT_THEME ? DARK_THEME : LIGHT_THEME
                if (browser) {
                    localStorage.setItem('theme', next)
                    document.documentElement.classList.toggle('dark', next === DARK_THEME)
                }
                return next
            })
        },
        init: () => {
            if (browser) {
                const theme = getInitialTheme()
                set(theme)
                document.documentElement.classList.toggle('dark', theme === DARK_THEME)
            }
        },
    }
}

export const theme = createThemeStore()
