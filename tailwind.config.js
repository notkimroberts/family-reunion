import daisyui from 'daisyui'
import { LIGHT_THEME, DARK_THEME } from './src/lib/general/constants/THEMES.ts'

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                heading: ['PT Serif', 'serif'],
                sans: ['Lato', 'sans-serif'],
            },
        },
    },
    plugins: [daisyui],
    daisyui: {
        themes: [LIGHT_THEME, DARK_THEME],
    },
}
