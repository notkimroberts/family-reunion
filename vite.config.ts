import { sveltekit } from '@sveltejs/kit/vite'
import { readFileSync } from 'fs'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    plugins: [
        sveltekit(),
        Icons({
            compiler: 'svelte',
        }),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
})
