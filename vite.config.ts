import { sentrySvelteKit } from '@sentry/sveltekit'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { defineConfig, loadEnv } from 'vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const org = '22aae0d29adf'
const project = 'family-reunion'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [
            sentrySvelteKit({
                org,
                project,
                // vite.config.ts runs before Vite loads .env into process.env, so loadEnv is needed to read it
                authToken: env.SENTRY_AUTH_TOKEN ?? process.env.SENTRY_AUTH_TOKEN,
                release: {
                    name: pkg.version,
                    deploy: {
                        env: process.env.SENTRY_ENVIRONMENT ?? 'production',
                    },
                },
            }),
            tailwindcss(),
            sveltekit(),
        ],
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(pkg.version),
        },
    }
})
